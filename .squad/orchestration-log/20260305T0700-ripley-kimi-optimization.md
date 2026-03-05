# Orchestration Log: Ripley — Kimi K2.5 Code-Level Changes

**Date:** 2026-03-05T0700Z  
**Agent:** Ripley (Backend Developer)  
**Status:** ✅ Completed  
**Mode:** Background  
**Model:** claude-sonnet-4.6

---

## Spawn

**Task:** Define exact code changes needed to implement Kimi K2.5 optimization (Tier 1 & 2) in `services/workers/meal_plan_generator/`.

**Context:**
- Ashley keeping Kimi K2.5; Dallas designed optimization strategy
- Goal: Translate architectural strategy into executable code patches
- Scope: llm_client.py, generator.py, config.py modifications
- Validate risk levels and implementation order

---

## Work Summary

**Artifact produced:** `.squad/decisions/inbox/ripley-kimi-k25-code-changes.md` (417 lines)

**Key deliverables:**

1. **Tier 1 Changes (4 modifications):**
   - 1.1: `llm_client.py:219` — Add `extra_body={"thinking": {"type": "disabled"}}`
   - 1.2: `llm_client.py:34` — Reduce `_MAX_TOKENS: 10000 → 4000`
   - 1.3: `llm_client.py:207-210` — Reduce HTTP timeout 300s → 60s (wire parameter)
   - 1.4: PoC test — Validate `response_format=json_object` with thinking disabled

2. **Tier 2 Changes (3 modifications):**
   - 2.1: `llm_client.py` — Add async version (AsyncAzureOpenAI) or use `asyncio.to_thread()`
   - 2.2: `generator.py:120-156` — Replace sequential loop with `asyncio.gather` + semaphore (max 2)
   - 2.3: `generator.py` — Remove 65s sleep (handled by parallelism)

3. **Tier 3 Changes (2 optimizations):**
   - 3.1: `generator.py:46` — Reduce `MAX_RETRIES: 3 → 2`
   - 3.2: `generator.py:445-448` — Reduce backoff: `60 * attempt → 15 * attempt`
   - 3.3: `generator.py:579-637` — Simplify `_extract_json()` (only after json_object PoC passes)

4. **Implementation Order:** 11-step sequential plan with risk + time estimates
   - Steps 1-5: Tier 1 quick wins (12 min total)
   - Step 6: PoC validation (30 min)
   - Steps 7-11: Tier 2 + 3 polish (2+ hours)

---

## Risk Assessment

| Change | Risk Level | Why | Mitigation |
|--------|-----------|-----|-----------|
| 1.1: extra_body parameter | Low | `extra_body` is standard; unknown fields are ignored | PoC test immediately |
| 1.2: max_tokens reduction | Low | 4K is 1.8x headroom for 7 recipes (~2200 tokens) | Monitor `finish_reason=length` |
| 1.3: HTTP timeout | Low-Medium | 60s may be tight if Azure throttles; generator retry loop catches timeout | Watch first week logs for exceptions |
| 1.4: json_object mode | Medium | Thinking-disabled may fix the JSON corruption; needs validation | PoC phase (step 6) |
| 2.1: Async conversion | Low | asyncio.to_thread() is safe; full async rewrite is medium-risk | Prefer to_thread() for MVP |
| 2.2: Parallel generation | Medium | Rate limit behavior needs monitoring; semaphore limits to 2 | Monitor 429 errors; increase stagger if needed |

---

## Expected Outcomes

| Metric | Before | After Tier 1 | After Tier 2 |
|--------|--------|--------------|--------------|
| Single dinner | 30-120s | 10-25s | 8-20s |
| 3 meal types | 4-10 min | 20-50s | 10-25s |
| JSON parse success | ~80% | ~95% | ~99% (with json_object) |
| TPM per call | 10,000 | 4,000 | 4,000 |
| NFR-01 (p95 < 30s) | ❌ Failed | ✅ Met | ✅ Comfortable |

---

## Key Files to Modify

1. `services/workers/meal_plan_generator/llm_client.py`
   - Lines: 34 (max_tokens), 207-210 (timeout), 219-231 (extra_body)
   
2. `services/workers/meal_plan_generator/generator.py`
   - Lines: 46 (MAX_RETRIES), 120-156 (parallel), 445-448 (backoff), 579-637 (extract_json)

3. `services/shared/shared/config.py`
   - Add env vars: `LLM_THINKING_MODE`, `LLM_MAX_TOKENS`

---

## PoC Validation Checklist

Before deploying Tier 1:

- [ ] Run 5 generations with thinking disabled, max_tokens=4000
- [ ] Measure: p50 latency < 15s? ✅
- [ ] Check: JSON validity (0 parse failures)? ✅
- [ ] Verify: No quality regression (reasonable recipes, diverse meals)? ✅
- [ ] Inspect output_tokens in logs (should be ~2000-3000, not >4000)? ✅

Before enabling json_object mode:

- [ ] Run 3 generations WITH `response_format=json_object`
- [ ] Compare success rate: with vs. without
- [ ] Check: Garbage characters, brace corruption, double-serialization? ❌
- [ ] If all clean: safe to remove `_extract_json()` repair code

---

## Next Steps

1. **Implement Tier 1** (steps 1-5 from implementation order)
2. **Run PoC** (step 6) — measure latency, validate JSON
3. **If PoC passes:** Enable json_object mode (step 7)
4. **Implement Tier 2** (steps 8-10) — parallel generation + semaphore
5. **Monitor production:** Watch logs for rate limits, timeouts, quality degradation
6. **Iterate:** Adjust semaphore, backoff, timeout based on real behavior

---

**Authored by:** Scribe (on behalf of Ripley)  
**Merged to decisions.md:** 2026-03-05T0700Z
