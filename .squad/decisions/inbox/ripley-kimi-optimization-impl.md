# Decision: Kimi K2.5 Optimization — Thinking Disabled, Knobs Tuned

**Date:** 2026-03-06
**Author:** Ripley (Backend Dev)
**Status:** Implemented (commit a901093, branch 005-grocery-enhancements)

## Context

Meal plan generation was slow (30-120s per request) due to Kimi K2.5's invisible reasoning token overhead. The team investigated and Dallas confirmed the Azure OpenAI API supports `{"thinking": {"type": "disabled"}}` via `extra_body`. Ashley decided to keep Kimi K2.5 rather than switch to GPT-4o-mini and optimize it instead.

## Decision

Disable Kimi K2.5 thinking mode via `extra_body` and re-tune all dependent parameters.

## Changes Implemented

### llm_client.py
| Parameter | Before | After | Rationale |
|-----------|--------|-------|-----------|
| `_MAX_TOKENS` | 10000 | 4000 | No reasoning tokens; 7 recipes ≈ 2200 tokens; 1.8x headroom |
| `GENERATION_TIMEOUT` | 25s | 60s | 25s was unrealistically tight; 60s is correct with thinking off |
| `httpx.Timeout` | hardcoded 300s | `float(timeout)` | Bug fix: timeout parameter was being ignored entirely |
| `extra_body` | not set | `{"thinking": {"type": "disabled"}}` | Eliminates 30-120s reasoning overhead |
| `response_format` | not set | `{"type": "json_object"}` | Safe now that thinking is off; no more JSON corruption |

### generator.py
| Parameter | Before | After | Rationale |
|-----------|--------|-------|-----------|
| `MAX_RETRIES` | 3 | 2 | JSON mode produces clean output; failures are rare |
| retry backoff | `60 * attempt` | `15 * attempt` | 4K tokens reset in ~12s at 20K TPM |
| pacing sleep | 65s | 5s | 4K tokens = 20% of 20K TPM; 5s spacing is safe |

## Scope Boundaries

- Only `_call_azure_openai()` modified — Anthropic and vanilla OpenAI paths unchanged
- No prompt files or schema files changed
- No new env vars introduced

## Expected Impact

- Multi-meal plan generation: from ~200s (3 × 65s pacing + LLM time) to ~15s
- Single plan: from 30-120s to ~5-10s (thinking overhead eliminated)
- Rate limit risk reduced (4K tokens vs 10K per request)
