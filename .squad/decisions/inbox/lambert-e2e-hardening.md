# Decision: E2E Test Suite Hardening and Feature Coverage

**Author:** Lambert (Tester)  
**Date:** 2026-03-02  
**Status:** Implemented  
**Branch:** 002-inventory-enhancements

## Context

The E2E test suite was reporting "27 passed, 9 skipped, 0 failed" while the preview environment was completely broken with 500 errors on all inventory POST requests. Tests were hiding real bugs by:

1. **Silent seed failures**: `seed-data.setup.ts` warned but didn't fail when seeding operations returned errors
2. **Defensive skip logic**: Tests checked for error states and skipped instead of failing
3. **Missing coverage**: 4 major new features (P5, P11, P14, P15) had ZERO E2E tests
4. **Incomplete tests**: Inventory form test didn't check for "freezer" location (a new feature)

## Decision

### 1. Seed Data Must Fail Hard

Changed `seed-data.setup.ts` to use `expect()` assertions instead of `console.warn() + return`:

```typescript
// BEFORE: Silent failure
if (!tokenResp.ok()) {
  console.warn(`Could not get access token (${tokenResp.status()})`);
  return;  // Tests skip, not fail
}

// AFTER: Hard failure
expect(tokenResp.ok(), `Failed to get access token: ${tokenResp.status()}`).toBeTruthy();
```

**Impact:** Tests that depend on seed-data now show as FAILED (not SKIPPED) when backend is broken.

### 2. API Errors Must Fail Tests, Not Skip Them

Changed defensive error checks to throw instead of skip:

```typescript
// BEFORE: Hide bugs as skips
const errorMessage = page.getByText("Failed to load inventory");
if (await errorMessage.isVisible().catch(() => false)) {
  test.skip(true, "Inventory API returned an error");  // BUG HIDDEN
  return;
}

// AFTER: Surface bugs as failures
if (await errorMessage.isVisible({ timeout: 2_000 }).catch(() => false)) {
  throw new Error("Inventory API returned an error - backend is failing");  // BUG VISIBLE
}
```

**Legitimate skips still allowed:**
- `test.skip(!process.env.USE_EXTERNAL_SERVER, ...)` — feature flag not set
- `test.skip(true, "No data to test")` — empty state is valid, not an error

### 3. New Features Get E2E Coverage

Added 8 new tests across 2 test suites:

**inventory.spec.ts (+5 tests):**
- Freezer location in form (added missing option to existing test)
- Add item to freezer location
- Defrost hours field visibility when freezer selected
- Staples management UI presence

**meal-plan.spec.ts (+3 tests):**
- Record leftovers button visible after meal cooked
- Leftover form has required fields (portions, storage location, expiry)
- Auto-deduct shows deduction information after marking meal as cooked

### 4. Test Real User Journeys

Pattern changed from "can I see the page?" to "does the workflow work?":

```typescript
// OLD: Just check element exists
await expect(page.getByRole("button", { name: "Add to Inventory" })).toBeVisible();

// NEW: Test full workflow
await ingredientInput.fill("chicken");
await firstSuggestion.click();
await page.getByLabel("Quantity").fill("500");
await page.getByRole("button", { name: "Add to Inventory" }).click();
await expect(ingredientInput).toHaveValue(""); // Verify form reset = success
```

## Rationale

**Why fail hard in seed-data:**
- Seed failures cascade to dependent tests — better to fail 20 tests than skip them and miss the root cause
- Skipped tests look like "not ready for preview" but failed tests look like "something is broken"
- CI status checks only fail on errors, not skips

**Why throw on API errors:**
- Error states are bugs, not missing features
- "Failed to load inventory" means backend is broken, not that inventory doesn't exist
- Skips hide bugs; failures surface them

**Why add feature tests now:**
- Prevents "test in production" — bugs found in preview, not after merge
- Documents expected behavior for reviewers
- Freezer/leftovers/staples/auto-deduct are user-visible features, not implementation details

## Validation

- ✅ TypeScript compiles: `cd apps/web && npx tsc --noEmit` (exit 0)
- ✅ Unit tests pass: `cd apps/web && npm test -- --run` (37 tests passed)
- ✅ Test files valid: Playwright syntax correct, imports resolve

**Next validation (requires running E2E):**
- When backend is healthy: New tests should pass
- When backend returns 500: Seed-data should fail (not skip), dependent tests should fail (not skip)
- When feature flags off: Tests should skip with clear message

## Files Changed

- `apps/web/e2e/seed-data.setup.ts`: Hard failures on seed errors
- `apps/web/e2e/inventory.spec.ts`: Fail on API errors, +5 tests for new features
- `apps/web/e2e/meal-plan.spec.ts`: +3 tests for leftovers and auto-deduct

## Future Work

- Add E2E tests for staples auto-add to grocery list (requires running meal plan generation with low staples)
- Add E2E tests for defrost reminder display on freezer items
- Consider adding visual regression tests for new UI components (leftover form, deduction display)
