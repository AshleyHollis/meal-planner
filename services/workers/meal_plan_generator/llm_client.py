"""LLM client abstraction supporting Anthropic and OpenAI providers."""

from __future__ import annotations

import time

from shared.config import get_settings
from shared.logging.config import get_logger
from tenacity import retry, stop_after_attempt, wait_exponential

logger = get_logger(__name__)

# Model defaults per provider
_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}

# Timeout defaults per use-case (seconds)
GENERATION_TIMEOUT = 25  # NFR-01: meal plan generation p95 < 30s
ADAPTATION_TIMEOUT = 8  # NFR-02: cook-time adaptation p95 < 10s

_MAX_TOKENS = 4096

# Approximate cost per 1K tokens (USD) for cost estimation
_COST_PER_1K = {
    "anthropic": {"input": 0.003, "output": 0.015},
    "openai": {"input": 0.005, "output": 0.015},
}


def _estimate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate LLM call cost in USD."""
    rates = _COST_PER_1K.get(provider, {"input": 0.0, "output": 0.0})
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
def call_llm(prompt: str, timeout: int = GENERATION_TIMEOUT) -> str:
    """Call the configured LLM provider and return the response text.

    Args:
        prompt: The prompt to send to the LLM.
        timeout: Request timeout in seconds (default: GENERATION_TIMEOUT).

    Returns:
        The LLM response text.

    Raises:
        ValueError: If the configured provider is not supported.
        Exception: If the LLM API call fails after retries.
    """
    settings = get_settings()
    provider = settings.llm.provider
    api_key = settings.llm.api_key

    start = time.monotonic()
    logger.info("llm_call_start", provider=provider, timeout_s=timeout)

    try:
        # Prefer Azure OpenAI when configured, regardless of provider setting
        if settings.llm.is_azure_configured:
            result = _call_azure_openai(prompt, settings, timeout)
        elif provider == "anthropic":
            result = _call_anthropic(prompt, api_key, timeout)
        elif provider == "openai":
            result = _call_openai(prompt, api_key, timeout)
        else:
            msg = f"Unsupported LLM provider: {provider}"
            raise ValueError(msg)
    except Exception:
        latency_ms = (time.monotonic() - start) * 1000
        logger.error("llm_call_failed", provider=provider, latency_ms=round(latency_ms, 1))
        raise

    latency_ms = (time.monotonic() - start) * 1000
    logger.info(
        "llm_call_complete",
        provider=provider,
        latency_ms=round(latency_ms, 1),
    )
    return result


def _call_anthropic(prompt: str, api_key: str, timeout: int) -> str:
    """Call Anthropic Claude API."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key, timeout=timeout)
    response = client.messages.create(
        model=_MODELS["anthropic"],
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    cost = _estimate_cost("anthropic", input_tokens, output_tokens)
    logger.info(
        "llm_usage",
        provider="anthropic",
        model=_MODELS["anthropic"],
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=round(cost, 6),
    )
    return text


def _call_openai(prompt: str, api_key: str, timeout: int) -> str:
    """Call OpenAI GPT API."""
    import openai

    client = openai.OpenAI(api_key=api_key, timeout=timeout)
    response = client.chat.completions.create(
        model=_MODELS["openai"],
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content or ""

    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    cost = _estimate_cost("openai", input_tokens, output_tokens)
    logger.info(
        "llm_usage",
        provider="openai",
        model=_MODELS["openai"],
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=round(cost, 6),
    )
    return text


def _call_azure_openai(prompt: str, settings: object, timeout: int) -> str:
    """Call Azure OpenAI API."""
    import openai

    llm = settings.llm  # type: ignore[attr-defined]
    deployment = llm.azure_deployment or _MODELS["openai"]

    client = openai.AzureOpenAI(
        api_key=llm.azure_api_key,
        azure_endpoint=llm.azure_endpoint,
        api_version=llm.azure_api_version,
        timeout=timeout,
    )
    response = client.chat.completions.create(
        model=deployment,
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content or ""

    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    cost = _estimate_cost("openai", input_tokens, output_tokens)
    logger.info(
        "llm_usage",
        provider="azure_openai",
        model=deployment,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=round(cost, 6),
    )
    return text
