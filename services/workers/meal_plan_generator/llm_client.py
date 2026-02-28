"""LLM client abstraction supporting Anthropic and OpenAI providers."""

from __future__ import annotations

from shared.config import get_settings
from shared.logging.config import get_logger

logger = get_logger(__name__)

# Model defaults per provider
_MODELS = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}

_DEFAULT_TIMEOUT = 120
_MAX_TOKENS = 4096


def call_llm(prompt: str, timeout: int = _DEFAULT_TIMEOUT) -> str:
    """Call the configured LLM provider and return the response text.

    Args:
        prompt: The prompt to send to the LLM.
        timeout: Request timeout in seconds (default: 120).

    Returns:
        The LLM response text.

    Raises:
        ValueError: If the configured provider is not supported.
        Exception: If the LLM API call fails.
    """
    settings = get_settings()
    provider = settings.llm.provider
    api_key = settings.llm.api_key

    logger.info("llm_call_start", provider=provider)

    if provider == "anthropic":
        return _call_anthropic(prompt, api_key, timeout)
    elif provider == "openai":
        return _call_openai(prompt, api_key, timeout)
    else:
        msg = f"Unsupported LLM provider: {provider}"
        raise ValueError(msg)


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
    logger.info("llm_call_complete", provider="anthropic", model=_MODELS["anthropic"])
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
    logger.info("llm_call_complete", provider="openai", model=_MODELS["openai"])
    return text
