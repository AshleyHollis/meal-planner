# Decision: SWA Preview Environment Cleanup Threshold

**Date:** 2026-03-03  
**Owner:** Parker (DevOps)  
**Status:** ✅ Implemented  
**Issue:** PR #3 preview environment deleted by concurrent PR deployments

## Problem
- `cleanup-stale-swa-environments` action in deploy-frontend-swa.yml was configured with `min-age-hours: "1"`
- When PR #003 (or any other PR) triggered preview deployment, cleanup deleted PR #3's SWA environment
- Root cause: 1-hour threshold too aggressive for multi-PR environment

## Decision
Increase `min-age-hours` from `"1"` to `"24"` in deploy-frontend-swa.yml

## Rationale
- **Safety:** 24-hour window allows concurrent PR deployments without interference
- **Cleanup:** Still enables eventual resource cleanup for truly abandoned preview environments
- **Balance:** Typical PR lifetime 1-7 days, so 24 hours prevents accidental deletion during active development
- **Alternative rejected:** Disabling cleanup entirely would accumulate stale preview environments indefinitely

## Changes
1. `.github/workflows/deploy-frontend-swa.yml` line 143: min-age-hours "1" → "24"
2. `apps/web/staticwebapp.config.json`: Added `navigationFallback` for Next.js routing

## Impact
- ✅ PR preview environments now survive 24+ hours
- ✅ Concurrent PR deploys no longer delete each other's environments
- ✅ Better SWA routing for Next.js client-side navigation (no more 404s on route changes)

## Related Files
- deploy-frontend-swa.yml (reusable workflow)
- preview.yml (calls deploy-frontend-swa with cleanup-stale-environments: true)
- shared-infra repo (cleanup-stale-swa-environments@v1 action — read-only)
