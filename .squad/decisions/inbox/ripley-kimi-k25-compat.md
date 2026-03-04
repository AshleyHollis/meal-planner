# Decision: LLM Azure path must be checked in ALL call sites

**Date:** 2026-03-04  
**Author:** Ripley  
**Status:** Proposed — for team review

## Context

Kimi K2.5 is deployed as a serverless model on Azure AI Foundry using the OpenAI-compatible chat completions endpoint. Our architecture routes to Azure OpenAI when `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` are set, regardless of `LLM_PROVIDER`.

The worker correctly checks `settings.llm.is_azure_configured` first. The API service had a separate `_call_llm()` function that didn't.

## Decision

**Any synchronous or async LLM call helper in ANY service must check `settings.llm.is_azure_configured` BEFORE checking `settings.llm.provider`.** The Azure path takes unconditional priority when both env vars are set.

Pattern (enforced across worker and API):
```python
if settings.llm.is_azure_configured:
    # use openai.AzureOpenAI(...)
elif provider == "anthropic":
    # ...
elif provider == "openai":
    # ...
else:
    raise ValueError(...)
```

## Changes Made

1. `services/api/src/api/services/meal_plan_service.py` — Added Azure branch to `_call_llm()` (used by `adapt_slot`)
2. `services/shared/shared/config.py` — Updated `azure_api_version` default: `2024-05-01-preview` → `2024-12-01-preview`
3. `k8s/base/api-deployment.yaml` — Added `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` env vars
4. `k8s/base-preview/api-deployment.yaml` — Same

## Deployment Instructions for Kimi K2.5

Store in Azure Key Vault (keys already mapped via ExternalSecret):
- `azure-openai-api-key` → your Azure AI Foundry API key
- `azure-openai-endpoint` → `https://aif-pai-dev-aue.cognitiveservices.azure.com/`
- `azure-openai-deployment` → `kimi-k25`

Leave `LLM_PROVIDER` at its default. The `is_azure_configured` check takes over automatically.

## Rationale

`LLM_PROVIDER` is a string field that only accepts `"anthropic"` or `"openai"` (Pydantic Literal). Rather than adding `"azure"` as a third provider value and updating every env config, we use the presence of the Azure credentials as the routing signal — which is more operationally ergonomic and avoids needing to set a new env var on switchover.
