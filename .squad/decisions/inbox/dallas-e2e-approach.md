# Decision: E2E Test Approach for Skipped Tests

**Author:** Dallas (Lead)
**Date:** 2026-03-02
**Status:** Decided
**Context:** PR #1 — 24/36 E2E tests pass, 12 skip. Two root causes.

---

## Problem 1: CORS / Inventory Tests (5 tests)

**Tests affected:** inventory.spec.ts — Edit, Remove, Expiry Badge, Autocomplete, Add Item

**Root cause:** The `nullslast()` 500 error was bypassing Starlette's CORSMiddleware. When an unhandled exception occurs in the async ORM layer, Starlette's `ServerErrorMiddleware` (outermost layer) returns a bare 500 response *outside* the CORS middleware chain — so no `Access-Control-Allow-Origin` header is added. The browser then reports a CORS error, even though the CORS regex is correct.

**Decision: No defensive CORS fix needed.**

The `nullslast()` fix (commit `eddc914`) resolved the root cause. With the 500 gone, the API returns proper 200 responses, CORSMiddleware adds headers, and the browser can read the response. The CORS regex already matches the SWA origin — verified with `re.fullmatch`.

**Action:** Wait for next pipeline run to confirm these 5 tests pass. If they still skip, investigate middleware ordering — but I'm 90%+ confident the 500 was the sole cause.

**Rationale:** Adding redundant CORS config (e.g., explicit SWA origin in `allow_origins`) would mask real issues and add maintenance burden. The regex approach is correct and cleaner.

---

## Problem 2: Meal Plan Stuck in Draft (7 tests)

**Tests affected:**
- meal-plan.spec.ts — 4 tests (status badges, detail view, back nav, generate plan)
- grocery.spec.ts — 3+ tests (all need active meal plan with grocery list)

**Root cause:** The worker pod requires Azure OpenAI to generate recipes and transition meal plans from `draft` → `active`. Azure OpenAI is not configured in the preview environment (no secrets in Key Vault for preview).

**Decision: Accept that these 7 tests skip in preview for MVP (option d).**

**Rationale:**
1. **Cost:** Azure OpenAI in preview environments adds per-request LLM costs for every PR push — not acceptable for MVP.
2. **Test design is solid:** All 7 tests have graceful skip logic (`test.skip(true, 'No meal plans to view')`) — they don't fail, they skip with clear messages.
3. **Seeding complexity:** Pre-seeding a completed meal plan (option b) would require either a test-only API endpoint or direct SQL access from GitHub Actions — both add maintenance burden disproportionate to the value.
4. **Coverage:** The 24 passing tests cover auth, page loads, forms, inventory CRUD, and smoke tests. The 7 skipped tests cover meal plan detail view and grocery interactions, which are worker-dependent by design.

**Follow-up (post-MVP):** If we want full E2E coverage, add a `POST /api/v1/test/seed-meal-plan` endpoint behind an `ENABLE_TEST_ENDPOINTS=true` flag that creates an `active` meal plan with pre-built slots and grocery items. This is option (b) done cleanly.

---

## Bonus: pre-commit.ci Blocker

**Problem:** pre-commit.ci fails with `Type tag 'typescript' is not recognized` because the `identify` library uses `ts` not `typescript` as the type tag.

**Fix:** Changed `typescript` → `ts` in `.pre-commit-config.yaml` line 14. This unblocks the PR.

---

## Summary

| Problem | Tests | Decision | Action |
|---------|-------|----------|--------|
| CORS / 500 | 5 | Fixed by nullslast() | Verify on next pipeline run |
| Meal plan draft | 7 | Accept skip in preview | No code change for MVP |
| pre-commit.ci | — | Config fix | `typescript` → `ts` in .pre-commit-config.yaml |

**Expected outcome after next pipeline push:** 29 pass, 7 skip, 0 fail. PR status: ✅ (pre-commit.ci + CI both green).
