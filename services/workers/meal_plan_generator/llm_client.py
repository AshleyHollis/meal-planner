"""LLM client abstraction supporting Anthropic and OpenAI providers.

Improvements:
- System/user prompt separation for better instruction following
- Temperature control (default 0.7) for consistent structured output
- JSON response format enforcement for OpenAI/Azure providers
- Configurable model via LLM_MODEL env var
"""

from __future__ import annotations

import time

from shared.config import get_settings
from shared.logging.config import get_logger
from tenacity import retry, stop_after_attempt, wait_exponential

logger = get_logger(__name__)

# Model defaults per provider (used when LLM_MODEL is not set)
_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}

# Timeout defaults per use-case (seconds)
GENERATION_TIMEOUT = 25  # NFR-01: meal plan generation p95 < 30s
ADAPTATION_TIMEOUT = 8  # NFR-02: cook-time adaptation p95 < 10s

_MAX_TOKENS = 8192

# Approximate cost per 1K tokens (USD) for cost estimation
_COST_PER_1K = {
    "anthropic": {"input": 0.003, "output": 0.015},
    "openai": {"input": 0.005, "output": 0.015},
}

# System instruction for JSON output (used when prompt doesn't split system/user)
_JSON_SYSTEM_INSTRUCTION = (
    "You are a meal planning assistant. Respond ONLY with valid JSON. "
    "No markdown fences, no explanation, no trailing commas."
)


def _estimate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate LLM call cost in USD."""
    rates = _COST_PER_1K.get(provider, {"input": 0.0, "output": 0.0})
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])


def _resolve_model(provider: str) -> str:
    """Resolve model name from settings or provider default."""
    settings = get_settings()
    return settings.llm.model or _MODELS.get(provider, _MODELS["openai"])


@retry(
    stop=stop_after_attempt(2),
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
    temperature = settings.llm.temperature

    start = time.monotonic()
    logger.info("llm_call_start", provider=provider, temperature=temperature, timeout_s=timeout)

    try:
        # Prefer Azure OpenAI when configured, regardless of provider setting
        if settings.llm.is_azure_configured:
            result = _call_azure_openai(prompt, settings, timeout, temperature)
        elif provider == "anthropic":
            result = _call_anthropic(prompt, api_key, timeout, temperature)
        elif provider == "openai":
            result = _call_openai(prompt, api_key, timeout, temperature)
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


def _call_anthropic(prompt: str, api_key: str, timeout: int, temperature: float) -> str:
    """Call Anthropic Claude API with system/user separation."""
    import anthropic

    model = _resolve_model("anthropic")
    client = anthropic.Anthropic(api_key=api_key, timeout=timeout)
    response = client.messages.create(
        model=model,
        max_tokens=_MAX_TOKENS,
        temperature=temperature,
        system=_JSON_SYSTEM_INSTRUCTION,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    cost = _estimate_cost("anthropic", input_tokens, output_tokens)
    logger.info(
        "llm_usage",
        provider="anthropic",
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=round(cost, 6),
    )
    return text


def _call_openai(prompt: str, api_key: str, timeout: int, temperature: float) -> str:
    """Call OpenAI GPT API with JSON mode and system/user separation."""
    import openai

    model = _resolve_model("openai")
    client = openai.OpenAI(api_key=api_key, timeout=timeout)
    response = client.chat.completions.create(
        model=model,
        max_tokens=_MAX_TOKENS,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _JSON_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
    )
    text = response.choices[0].message.content or ""

    usage = response.usage
    input_tokens = usage.prompt_tokens if usage else 0
    output_tokens = usage.completion_tokens if usage else 0
    cost = _estimate_cost("openai", input_tokens, output_tokens)
    logger.info(
        "llm_usage",
        provider="openai",
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=round(cost, 6),
    )
    return text


def _call_azure_openai(prompt: str, settings: object, timeout: int, temperature: float) -> str:
    """Call Azure OpenAI API with JSON mode and system/user separation."""
    import httpx
    import openai

    llm = settings.llm  # type: ignore[attr-defined]
    deployment = llm.azure_deployment or _resolve_model("openai")

    # Explicitly use certifi CA bundle to avoid Aspire's SSL_CERT_DIR override
    try:
        import certifi

        ca_bundle = certifi.where()
    except ImportError:
        ca_bundle = True  # type: ignore[assignment]

    # Use a generous timeout (LLM calls can take 30s+) and disable SDK retries
    http_client = httpx.Client(
        verify=ca_bundle,
        timeout=httpx.Timeout(60.0, connect=10.0),
    )

    client = openai.AzureOpenAI(
        api_key=llm.azure_api_key,
        azure_endpoint=llm.azure_endpoint,
        api_version=llm.azure_api_version,
        http_client=http_client,
        max_retries=0,
    )
    response = client.chat.completions.create(
        model=deployment,
        max_tokens=_MAX_TOKENS,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _JSON_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
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
