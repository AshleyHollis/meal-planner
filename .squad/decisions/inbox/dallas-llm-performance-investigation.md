# Decision: LLM Performance Investigation — Root Cause Analysis & Recommendations

**Date:** 2026-03-09  
**Author:** Dallas (Lead)  
**Status:** Proposed — for team review  
**Requested by:** Ashley Hollis

---

## Executive Summary

Meal plan generation is slow because we deployed a 1-trillion-parameter reasoning model (Kimi K2.5) to do structured JSON generation — a task that needs zero reasoning. The model burns invisible thinking tokens before producing output, the Azure rate limit (20K TPM) throttles throughput, and the code adds defensive sleeps and retries that compound the problem. Switching to GPT-4o-mini with native JSON mode would cut generation time from **2-5+ minutes to ~10-20 seconds** for single-meal, and **~15-25 seconds** for multi-meal plans.

---

## 1. Root Cause Assessment

### Bottleneck Breakdown (Single Dinner Plan — 7 Recipes)

| Bottleneck | Time Contribution | Explanation |
|---|---|---|
| **Kimi K2.5 thinking tokens** | 30-120s | Reasoning model generates invisible chain-of-thought before answering. These tokens count against output budget AND rate limit, but produce no user-visible value for structured JSON generation. |
| **Rate limit throttling (20K TPM)** | 15-60s | `max_tokens=10000` reserves 10K of the 20K/min budget per request. Azure charges token allocation upfront. With reasoning overhead, a single request can exhaust the full minute's budget. |
| **HTTP read timeout (300s)** | Masks the problem | `llm_client.py:209` sets a 300s read timeout. The code *waits* up to 5 minutes for a response that should take <30s per NFR-01. This timeout is a symptom — the team knew responses were slow. |
| **Retry backoff (60s x attempt)** | 60-180s per failure | `generator.py:446-448`: On 429/validation failure, waits 60s, 120s, 180s. With a 20K TPM limit, retries after a long request genuinely need this wait — but it means a single retry adds 1-3 minutes. |
| **Multi-meal 65s pacing sleep** | 65s x (N-1) meal types | `generator.py:127`: Between sequential per-type LLM calls, a hard 65s sleep avoids token-bucket exhaustion. For breakfast+dinner: 65s wasted. For breakfast+lunch+dinner: 130s wasted. |
| **JSON repair overhead** | 1-5s + retry risk | `generator.py:579-637`: `_extract_json()` must strip thinking blocks, repair double-serialized arrays, and recover truncated JSON. Each of these failure modes triggers retries, compounding all the above. |
| **No JSON mode for Kimi** | N/A | `llm_client.py:225-226`: Comment explicitly says "Do NOT use response_format=json_object with reasoning models" because Kimi corrupts JSON when forced to use it. |

### Estimated Total Time Budget (Worst Case)

| Scenario | Happy Path | 1 Retry | 2 Retries |
|---|---|---|---|
| **Single dinner** | 30-120s | 90-300s | 150-480s |
| **Breakfast + dinner** | 95-185s (incl 65s sleep) | 155-485s | 215-660s |
| **3 meal types** | 160-250s (incl 130s sleep) | 220-610s | 280-840s |

**NFR-01 target is p95 < 30s.** We are 4-16x over that target.

### Why Kimi K2.5 is the Wrong Model

Kimi K2.5 is a **1T parameter Mixture-of-Experts reasoning model** (32B active parameters). It was designed for complex agentic workflows with multi-step reasoning, vision-language tasks, and code generation requiring deep logical chains.

Our use case is: **"Given a list of ingredients and equipment, produce 7 JSON recipes."** This is a structured data generation task. It needs fast token generation, reliable JSON output (native JSON mode), and low cost per call. The reasoning capabilities are not just unnecessary — they actively harm performance by consuming output tokens on invisible thinking.

---

## 2. Model Recommendation

### Tier 1: GPT-4o-mini (RECOMMENDED — Switch Immediately)

| Metric | Kimi K2.5 (Current) | GPT-4o-mini | Delta |
|---|---|---|---|
| **Tokens/sec** | ~10-20 (throttled) | ~79 | **4-8x faster** |
| **Time-to-first-token** | 5-30s (thinking) | ~1s | **5-30x faster** |
| **JSON mode** | No (corrupts output) | Native `response_format` | Eliminates repair code |
| **Structured outputs** | No | Strict JSON schema | Eliminates validation retries |
| **Cost (input/1M)** | $0.60 | $0.15 | **4x cheaper** |
| **Cost (output/1M)** | $3.00 | $0.60 | **5x cheaper** |
| **Est. cost per plan** | ~$0.06-0.10 | ~$0.01-0.02 | **Well under NFR-10 $0.15** |
| **Reasoning overhead** | Yes (invisible tokens) | None | Eliminates waste |
| **Azure availability** | GlobalStandard only | Standard/Global | Higher TPM available |

**Verdict:** GPT-4o-mini is the right tool for this job. It's faster, cheaper, and produces clean JSON natively.

### Tier 2: GPT-4o (Balanced Alternative)

Use if GPT-4o-mini quality proves insufficient for complex cuisine-type matching or nuanced preference handling. ~3x more expensive than mini but still 2-3x cheaper than Kimi. Same JSON mode support.

### Tier 3: Phi-4-mini / Phi-4 (Future Optimization)

Small Azure-native models. Potentially faster and cheaper, but need testing for recipe generation quality. Consider after GPT-4o-mini is proven.

### Tier 4: Keep Kimi K2.5 (for reasoning-heavy tasks only)

Kimi K2.5 may still have value for recipe substitution with complex constraint reasoning (adapt_slot) or future agentic meal planning with multi-step decision chains. Do NOT delete the deployment. Reconfigure it as a secondary model invoked only when reasoning is needed.

---

## 3. Architecture Changes

### Phase 1: Model Switch (Highest Impact, Lowest Risk)

**Files to change:**

1. **`llm_client.py`** — Core changes:
   - `_call_azure_openai()`: Add `response_format={"type": "json_object"}` (safe for GPT-4o-mini)
   - Reduce `_MAX_TOKENS` from 10000 to 4000 (7 recipes with ingredients/steps ~ 2000-3000 output tokens)
   - Reduce HTTP read timeout from 300s to 60s
   - Remove Kimi-specific comments about JSON corruption
   - Update `_JSON_SYSTEM_INSTRUCTION` — remove the anti-serialization instructions
   - Update cost estimates for GPT-4o-mini pricing

2. **`generator.py`** — Retry/pacing changes:
   - Reduce `MAX_RETRIES` from 3 to 2 (failures should be rare with native JSON)
   - Reduce retry backoff from `60 * attempt` to `15 * attempt`
   - Reduce multi-meal pacing sleep from 65s to 5-10s (or eliminate — see Phase 2)
   - Simplify `_extract_json()` — remove Kimi-specific repair logic
   - Keep `_recover_truncated_json()` as a safety net but expect it to never trigger

3. **Azure deployment:**
   - Deploy GPT-4o-mini in the same resource group
   - Update Key Vault secrets: `azure-openai-deployment` to new deployment name
   - Request higher TPM quota if needed (PAYG can often go to 60K+ for GPT-4o-mini)

### Phase 2: Parallel Multi-Meal Generation (High Impact)

Currently: sequential with 65s sleep between meal types.  
Target: parallel with `asyncio.gather()`.

With reduced `max_tokens=4000` and higher TPM quota (request 60K+), multiple concurrent requests fit within the rate limit. Even at 20K TPM, two parallel requests of 4000 max_tokens each = 8000 TPM per pair. Total time drops from `N x (generation + 65s)` to `max(generation_times)`.

**Risk:** If TPM is still tight, add a semaphore (max 2 concurrent) rather than going fully sequential.

### Phase 3: Strict Structured Outputs (Quality Improvement)

Azure OpenAI supports strict JSON schema enforcement for GPT-4o models using `response_format: {"type": "json_schema", "json_schema": {"name": "meal_plan", "strict": true, "schema": ...}}`.

**Benefits:**
- Eliminates ALL JSON parsing failures
- Eliminates `_extract_json()` entirely
- Eliminates `_recover_truncated_json()`
- Eliminates validation-driven retries (schema enforced at generation time)
- Only constraint validation (allergens, equipment modes) remains as a retry trigger

**Risk:** Strict mode may slightly increase latency (~10-15%) due to schema enforcement. Test in PoC.

### Phase 4: Reduce Token Budget

Current `_MAX_TOKENS=10000` is 2-3x more than needed:

| Content | Estimated Tokens |
|---|---|
| 7 recipe titles + descriptions | ~300 |
| 7 x 6 ingredients (name, qty, unit) | ~600 |
| 7 x 4 steps (instruction, equipment, temp, time) | ~1000 |
| JSON structure overhead | ~300 |
| **Total** | **~2200** |

**Recommendation:** Set `_MAX_TOKENS=4000` (80% headroom). This reduces Azure rate limit consumption by 60%, enables more concurrent requests within TPM budget, reduces truncation risk to near-zero, and cuts cost proportionally.

---

## 4. Azure Deployment Strategy

### Immediate (Week 1)

1. **Deploy GPT-4o-mini** in `rg-pai-dev-eus` (East US) or `rg-pai-dev-aue` (existing account)
   - SKU: `GlobalStandard` (same as Kimi)
   - Initial capacity: 1 (20K TPM baseline)
2. **Request quota increase** to 60K TPM for GPT-4o-mini (Azure Portal > Quotas)
3. **Update Key Vault** secrets to point to new deployment
4. Keep Kimi K2.5 deployment active but unused (fallback)

### Medium Term (Month 1)

5. If usage grows, consider **Provisioned Throughput Units (PTU)** for guaranteed capacity
   - PTU provides dedicated throughput, no shared contention
   - Break-even: ~$50-100/day at current volume — likely not worth it yet

### Long Term

6. Evaluate **Phi-4-mini** as cost optimization (Azure-native, potentially self-hosted on AKS)
7. Consider **model routing**: GPT-4o-mini for generation, Kimi K2.5 for complex substitution reasoning

---

## 5. PoC Plan

### Step 1: Deploy GPT-4o-mini on Azure (Parker — 1 hour)

Deploy via Azure CLI to existing AI Foundry account.

### Step 2: Code Changes for PoC (Ripley — 2 hours)

Minimal changes to test the model switch:
1. `llm_client.py`: Add `response_format={"type": "json_object"}` to `_call_azure_openai()`
2. `llm_client.py`: Reduce `_MAX_TOKENS` to 4000
3. `llm_client.py`: Reduce HTTP timeout to 60s
4. Update `AZURE_OPENAI_DEPLOYMENT` env var to `gpt-4o-mini`

### Step 3: Measure (Ripley — 1 hour)

Run 5 meal plan generations and log:
- Time-to-first-token
- Total generation time
- Output token count
- JSON parse success rate (should be 100% with JSON mode)
- Recipe quality (manual inspection)

### Step 4: Decision Gate

| Metric | Pass Criteria |
|---|---|
| p95 generation time (single dinner) | < 30s (NFR-01) |
| JSON parse success rate | 100% (no repair needed) |
| Recipe quality | Comparable to Kimi output |
| Cost per plan | < $0.05 |

If all pass: proceed with full Phase 1-4 implementation.  
If quality fails: try GPT-4o (same changes, different deployment name).

---

## 6. Risk Assessment

### Model Switch Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GPT-4o-mini recipe quality lower than Kimi | Low | Medium | Manual review in PoC. Kimi's reasoning doesn't improve recipe quality for this task. |
| GPT-4o-mini doesn't follow cuisine constraints | Low | Low | JSON mode + structured outputs enforce schema. Cuisine matching is prompt-guided anyway. |
| Azure quota request denied/delayed | Low | Medium | Start with existing 20K TPM + reduced max_tokens. Even at 20K TPM, GPT-4o-mini is 4-8x faster. |
| Parallel generation hits rate limits | Medium | Low | Add semaphore limiting to 2 concurrent. Still faster than sequential + 65s sleep. |
| Strict structured output increases latency | Low | Low | 10-15% overhead is acceptable when base time drops from 120s to 15s. |
| Kimi deployment still incurs cost | Low | Low | GlobalStandard is pay-per-token. No tokens = no cost. Keep as fallback. |

### Risks of NOT Switching

| Risk | Likelihood | Impact |
|---|---|---|
| Users abandon app due to 2-5 minute generation times | High | Critical |
| Multi-meal plans become unusable (3+ minutes sequential) | High | High |
| JSON repair failures cause plan generation to fail entirely | Medium | High |
| Rate limit 429s cascade into 3-retry loops (8+ minutes) | Medium | High |
| Cost per plan rises with multi-meal (3x LLM calls) | High | Medium |

---

## 7. Recommended Implementation Order

| Priority | Change | Impact | Effort | Owner |
|---|---|---|---|---|
| **P0** | Deploy GPT-4o-mini + update deployment env var | Immediate 4-8x speedup | 1h | Parker |
| **P0** | Enable `response_format: json_object` | Eliminates JSON corruption | 5 min | Ripley |
| **P0** | Reduce `_MAX_TOKENS` to 4000 | 60% less rate limit consumption | 5 min | Ripley |
| **P1** | Reduce HTTP timeout to 60s | Faster failure detection | 5 min | Ripley |
| **P1** | Reduce retry backoff to 15s x attempt | 75% faster recovery | 5 min | Ripley |
| **P1** | Reduce multi-meal sleep from 65s to 5s | 60s saved per extra meal type | 5 min | Ripley |
| **P2** | Parallel multi-meal generation | Eliminates sequential penalty | 1h | Ripley |
| **P2** | Enable strict structured outputs | Eliminates JSON validation retries | 30 min | Ripley |
| **P3** | Remove `_extract_json()` repair code | Code simplification | 30 min | Ripley |
| **P3** | Request 60K TPM quota | Headroom for concurrency | 15 min | Parker |

**Total estimated effort:** ~4-5 hours for full implementation, with P0 changes alone delivering 80%+ of the improvement.

---

## 8. Summary of Key Numbers

| Metric | Current (Kimi K2.5) | After P0 Changes (GPT-4o-mini) | After Full Implementation |
|---|---|---|---|
| Single dinner generation | 30-120s | 8-20s | 5-15s |
| Breakfast + dinner | 95-300s | 16-40s | 8-20s (parallel) |
| 3 meal types | 160-480s | 24-60s | 8-20s (parallel) |
| JSON parse success | ~80% (needs repair) | ~99% (JSON mode) | 100% (strict schema) |
| Cost per dinner plan | $0.06-0.10 | $0.01-0.02 | $0.01-0.02 |
| Retry rate | ~20-30% | ~5% | ~2% |
| NFR-01 compliance | 4-16x over target | Within target | Comfortably within |

---

*This analysis is based on code inspection of `services/workers/meal_plan_generator/`, Azure deployment decisions in `.squad/decisions/inbox/`, NFR requirements in `specs/001-meal-planner-mvp/requirements.md`, and web research on model benchmarks. No code was modified.*