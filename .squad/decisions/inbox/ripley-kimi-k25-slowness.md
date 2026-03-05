# Decision: Kimi K2.5 Generation Slowness — Root Causes and Fixes

**Author:** Ripley
**Date:** 2026-03-09
**Branch:** 005-grocery-enhancements
**Commit:** 53dba9d

## Problem

Meal plan generation was reported as "taking a very long time" on the preview deployment
(https://agreeable-plant-04ffe2700-pr5.eastasia.6.azurestaticapps.net/meal-plan/3c69e760-9785-4515-91ae-2abd72c9f93f).

## Code Bugs Fixed

### 1. Stagger sleep inside semaphore (generator.py)
**Was:** syncio.sleep(2 * index) ran INSIDE sync with semaphore:
**Impact:** For 3 meal types, index=1 held a semaphore slot for 2s before starting work, preventing index=2 from acquiring the slot.
**Fix:** Moved sleep BEFORE sync with semaphore:, reduced to 1 * index seconds.

### 2. Schema JSON with indent=2 (prompts.py)
**Was:** json.dumps(schema, indent=2) → ~2500 chars with whitespace
**Impact:** ~300 extra input tokens per LLM call (×3 for 3 meal types = 900 tokens). With 20K TPM and capacity=1, every token reservation matters.
**Fix:** Removed indent=2 — compact schema saves ~300 tokens per call.

### 3. No diagnostic logging for Azure request params (llm_client.py)
**Was:** No log confirming deployment name, max_tokens, or thinking=disabled being sent.
**Fix:** Added zure_request_params log + prompt_chars to llm_call_start.

## Primary Suspected Bottleneck (Still Requires Monitoring)

**Azure 20K TPM rate limiting is the most likely cause of "very long time":**
- Each call reserves up to 6K tokens (2K input + 4K max output)
- 20K TPM / 6K = ~3.3 calls/minute — barely enough for 3-type generation
- If thinking is NOT disabled (Azure proxy strips extra_body), invisible reasoning tokens (2000-8000 each) immediately exhaust the budget → 429 → 65s backoff

## Monitoring Guidance

After deploying, watch for these log events:
- 	hinking_not_disabled → Azure is stripping extra_body.thinking param; escalate to Azure support
- ate_limit_retry_after with values >30s → 429s dominating; consider capacity increase
- prompt_chars >8000 in llm_call_start → input tokens too large; trim prompt sections

## Recommendation if 429s Dominate

If monitoring confirms frequent 429s after deployment:
- Request capacity increase from 1 → 2 on the Azure AI Foundry deployment (doubles TPM to 40K)
- OR reduce _MAX_TOKENS from 4000 → 3000 (7 recipes use ~2200 tokens actual; 3000 has 1.36× headroom)
- Both can be done independently without code changes (max_tokens) or with a 1-line change (_MAX_TOKENS)
