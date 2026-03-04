# Decision: Deploy Kimi K2.5 on Existing Azure AI Foundry Account

**Date:** 2026-03-04  
**Author:** Parker (DevOps)  
**Status:** Implemented

## Decision

Deploy Kimi K2.5 on the existing Azure AI Services account `aif-pai-dev-aue` in resource group `rg-pai-dev-aue`, subscription `28aefbe7-e2af-4b4a-9ce1-92d6672c31bd`. Do NOT create a new account.

## Context

Ashley requested Kimi K2.5 model deployment on the existing Azure AI Foundry account. The account `aif-pai-dev-aue` already exists and is provisioned.

**⚠️ Region Discrepancy Flagged:**  
The `-aue` suffix on the resource name indicates **Australia East**, not East US. Ashley mentioned "US instance" but the existing resource is in AU East. The decision was to proceed with the existing account rather than create a new one. If a US region account is required, a new `AIServices` account in `eastus` would need to be created.

## Changes Made

1. **`scripts/deploy-kimi-k25.sh`** — Rewritten to:
   - Target `aif-pai-dev-aue` / `rg-pai-dev-aue` / subscription `28aefbe7-e2af-4b4a-9ce1-92d6672c31bd`
   - Verify (not create) the account before deploying
   - Use `--sku-name GlobalStandard` (required for Kimi K2.5 in Azure AI Foundry)
   - Auto-detect Key Vault from resource group (or override with `KEY_VAULT_NAME` env var)

2. **`k8s/base/worker-deployment.yaml`** — Added `LLM_PROVIDER=openai` env var

3. **`k8s/base-preview/worker-deployment.yaml`** — Added `LLM_PROVIDER=openai` env var

## Key Vault

Key Vault name is resolved at runtime by auto-detecting the first KV in `rg-pai-dev-aue`. Override via `KEY_VAULT_NAME=<name>` env var if the auto-detect picks the wrong one.

The following KV secrets are written:

- `azure-openai-api-key`
- `azure-openai-endpoint`
- `azure-openai-deployment` (value: `kimi-k25`)

These are already mapped in `k8s/base/externalsecret-llm.yaml` → no changes needed there.

## Rationale

- Reusing existing account avoids provisioning overhead and keeps billing consolidated
- `GlobalStandard` SKU is the correct tier for third-party models (Kimi K2.5, Llama, etc.) in Azure AI Foundry
- `LLM_PROVIDER=openai` ensures the app routes through the OpenAI-compatible code path — Kimi K2.5 uses the standard `/chat/completions` API
