# Decision: Extend Seed Data to Unblock Meal Plan Tests

**Proposed by**: Lambert (Tester)  
**Date**: This session  
**Status**: PROPOSED

## Problem

7 of 12 skipped tests (meal-plan.spec.ts + grocery.spec.ts) cannot run because:
- `seed-data.setup.ts` creates a meal plan but it stays in draft status
- Worker pod (which generates recipes via Azure OpenAI) either:
  - Is not running in preview environment, OR
  - Doesn't have Azure OpenAI credentials configured
- Tests skip rather than fail because no meal plan exists to navigate to

## Options Considered

1. **Configure Azure OpenAI in Preview**
   - Pros: Tests the real worker flow end-to-end
   - Cons: Requires Azure setup, May not be available in preview tier

2. **Pre-seed a Completed Meal Plan** (Recommended)
   - Pros: Unblocks E2E tests immediately; doesn't require LLM
   - Cons: Tests don't validate real worker behavior (but worker can be tested separately)
   
3. **Accept skip in preview**
   - Pros: Simple
   - Cons: No coverage for meal-plan and grocery flows in E2E pipeline

## Recommendation

**Investigate Option 1 first** (Azure OpenAI in preview) — check:
- Is worker deployment running in preview? `kubectl get deployments -n preview-pr-1 | grep worker`
- Are Azure OpenAI secrets configured? `az keyvault secret list --vault-name kv-ytsumm-prd --query "[?starts_with(name, 'meal-planner-openai')]"`

**If not available**: Implement Option 2 — extend seed-data to directly create a completed meal plan:
- Create a single meal plan with hardcoded `status='active'` 
- Create 7 meal slots (Monday-Sunday) with recipes
- Create grocery list items
- This unblocks all 7 meal-plan + grocery tests without LLM

## Note for Tester

Seed-data currently:
- Waits 120s for worker to complete (lines 166-191)
- Already has the polling loop & status check logic
- Could easily be extended to create slots + grocery on timeout
