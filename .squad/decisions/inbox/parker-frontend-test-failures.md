# Frontend Test Failures Block PR #5 Deployment

**Date:** 2026-03-04  
**Triggered by:** CI/CD pipeline verification for PR #5 (005-grocery-enhancements)  
**Status:** Blocking → Preview environment not deployed

## Issue

CI run #22651713954 failed due to frontend test text mismatch failures. The pipeline correctly halted preview deployment as a result.

### Failing Tests

**File:** `apps/web/src/__tests__/MealHistoryList.test.tsx`
- Line 51: Test expects "No meal history yet", component renders "No Meals Yet"

**File:** `apps/web/src/__tests__/ExpiryBadge.test.tsx`
- Line 39: Test expects "Expires in 7d", component renders "7d left"
- Line 46: Test expects "Expires in 2d", component renders "2d left"  
- Line 53: Test expects "Expires in 0d", component renders "0d left"

### Root Cause

Component UI text was updated (likely in this PR's changes) but test assertions were not updated to match.

## Pipeline Impact

1. **CI Failure** → Frontend Quality job exit code 1
2. **CI Status Gate** → Fails entire CI workflow
3. **Preview Deployment Blocked** → "Wait for CI" job detects failure, halts pipeline
4. **No Preview Environment** → PR #5 has no live preview to test

## Solution

Update test expectations to match component rendering:

```bash
# File: apps/web/src/__tests__/MealHistoryList.test.tsx
# Change: expect(screen.getByText(/No meal history yet/i))
# To:     expect(screen.getByText(/No Meals Yet/i))

# File: apps/web/src/__tests__/ExpiryBadge.test.tsx
# Change text matchers from "Expires in Xd" to "Xd left"
```

## Verification

After fixes:
1. Push corrected tests
2. CI run #2 should pass all jobs including Frontend Quality
3. Preview Deployment workflow auto-triggers
4. Preview environment deploys to AKS + SWA
5. E2E tests run against live preview

## Notes

- CI gate is functioning correctly—it should block deployment when tests fail
- No infrastructure issues detected
- This is application code/test sync issue, not DevOps/pipeline issue
