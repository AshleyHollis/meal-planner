# Orchestration Log: Dallas — Kimi K2.5 Optimization Strategy

**Date:** 2026-03-05T0700Z  
**Agent:** Dallas (Lead Architect)  
**Status:** ✅ Completed  
**Mode:** Background  
**Model:** claude-opus-4.6

---

## Spawn

**Task:** Define comprehensive optimization strategy for Kimi K2.5 to meet NFR-01 (p95 < 30s for meal plan generation).

**Context:**

- Ashley decided to keep Kimi K2.5 instead of switching to GPT-4o-mini
- Performance bottleneck: Kimi's invisible "thinking mode" consumes 25-110s of latency per request
- Goal: Achieve <30s single-dinner generation and <45s for 3-meal-type generation without model switch

---

## Work Summary

**Artifact produced:** `.squad/decisions/inbox/dallas-kimi-k25-optimization-strategy.md` (432 lines)

**Key findings:**

1. **Thinking Mode Discovery:** Kimi K2.5 API exposes `extra_body={"thinking": {"type": "disabled"}}` parameter that eliminates invisible reasoning tokens entirely. This is the primary performance lever.

2. **Tier 1 (Quick Win):** Disable thinking + reduce max_tokens 10K → 4K
   - Single dinner: 30-120s → 5-15s
   - Cost impact: -60% TPM footprint
   - Risk: Low (easily reverted)

3. **Tier 2 (Parallelism):** Multi-meal concurrent generation with semaphore
   - 3 meal types: 4-10 min → 8-20s (parallel)
   - Requires: Async LLM client + asyncio.gather
   - Sleep reduction: 65s → 2-5s pacing

4. **Tier 3 (Optional):** Streaming + 40K TPM quota increase
   - Only pursue if Tier 2 doesn't meet targets
   - Streaming adds architectural complexity (not recommended for MVP)

5. **JSON Corruption Fix:** With thinking disabled, `response_format={"type": "json_object"}` should work cleanly. PoC validation required before removal of `_extract_json()` repair code.

6. **Quota Strategy:** Current 20K TPM limit supports ~2 calls/min. Tier 1 (4K tokens per call) enables ~5 calls/min—sufficient for Tier 2 parallelism. Tier 3 would request 40K TPM.

---

## Risk Assessment

| Risk                                    | Severity | Likelihood | Mitigation                                                     |
| --------------------------------------- | -------- | ---------- | -------------------------------------------------------------- |
| Quality degradation with thinking off   | Medium   | Low-Medium | PoC phase validates before shipping                            |
| `extra_body` parameter unsupported      | High     | Low-Medium | Test immediately in PoC; fallback to `reasoning_effort: "low"` |
| Azure rate-limit behavior change        | Medium   | Low        | PoC monitors actual TPM consumption                            |
| Parallel calls trigger burst throttling | Medium   | Medium     | 2-5s stagger between parallel requests                         |
| 60s HTTP timeout too tight              | Medium   | Medium     | Monitor first week for timeout exceptions                      |

---

## Next Steps

1. **Ripley:** Implement Tier 1 code changes (5 files, ~20 lines each)
2. **Ripley:** PoC test for thinking-disabled mode + json_object validation
3. **Parker:** Request 40K TPM quota (if Tier 2 parallelism demands it)
4. **Team:** Monitor latency + cost post-deployment

---

## Decision

**KEEP Kimi K2.5.** Proceed with Tier 1 + Tier 2 optimization. This is projected to bring single-dinner generation from 30-120s to 5-15s, and 3-meal-type generation from 4-10 minutes to 8-20 seconds, meeting NFR-01 without a model switch.

The `thinking` parameter is the key lever. If the Azure proxy supports it, we solve the performance problem. If not, `reasoning_effort: "low"` or token starvation are viable fallbacks.

---

**Authored by:** Scribe (on behalf of Dallas)  
**Merged to decisions.md:** 2026-03-05T0700Z
