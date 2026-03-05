# Decision: Preview Deployment Performance Scaling Strategy

**Date:** 2026-03-06  
**Owner:** Parker (DevOps)  
**Status:** Proposed  
**Priority:** P1 (Blocking user experience)

## Problem Statement

Meal plan generation on preview deployment is taking excessive time. Users report multi-minute waits for simple plans that should complete in seconds.

## Root Cause

Two-tier bottleneck:

1. **Azure AI Foundry:** Single capacity unit (20K TPM) limits throughput. Kimi K2.5 requests (20-120s each) block queue.
2. **Kubernetes Worker:** Single pod with 25m CPU request (preview overlay) causes throttling during LLM wait cycles.

## Proposed Solution

### Immediate Actions (Deploy Today — 30 min)

#### 1. Scale Azure AI Kimi K2.5: 1→4 Capacity

```bash
./scripts/scale-kimi-k25.sh --execute
```

**Impact:**

- Increases TPM quota from ~20K to ~80K (4x)
- Enables 4 parallel meal plan requests
- **Cost:** $0 additional (token pricing unchanged)
- **Downtime:** ~5 minutes

**Why This Script:**

- Pre-flight checks validate Azure CLI login, resource group, AI account, deployment
- Dry-run by default (shows exactly what will run)
- Post-flight verification confirms target capacity reached
- Idempotent (safe to re-run)

**Evidence:** Script already tested and documented in Parker's history (2026-03-06)

#### 2. Increase Worker Pod CPU Limits (Preview)

Edit `k8s/overlays/preview/kustomization.yaml` line 144:

```yaml
# From:
  limits:
    cpu: 150m

# To:
  limits:
    cpu: 300m
```

**Impact:**

- Reduces CPU throttling during LLM wait cycles
- Worker can handle request queue more efficiently
- Still safe (base allows 500m; 300m preview is reasonable)
- **Cost:** $0 (same node utilization, better scheduling)

**Why:** Preview is resource-constrained intentionally, but 150m is too low for blocking I/O workloads (LLM calls). Doubling to 300m provides headroom without excessive resource usage.

### Short-term Actions (Within 1 week)

#### 3. Add LLM Request Timeout Configuration

Add to `k8s/base/configmap.yaml`:

```yaml
LLM_REQUEST_TIMEOUT: "60"
LLM_POOL_SIZE: "5"
```

**Impact:**

- Prevents indefinite hangs if Azure OpenAI becomes unresponsive
- Enables connection pooling for parallel requests
- Allows tuning without redeployment

#### 4. Monitor and Iterate

- Watch worker logs for latency reduction: `kubectl logs -l app.kubernetes.io/name=meal-plan-worker -n preview-pr-X --tail=100 | grep -i duration`
- Set CloudWatch alarm: Worker LLM latency > 120s → Page on-call
- Baseline throughput: Measure plans/min before and after scaling

### Long-term Actions (Strategic)

#### 5. Model Switch to GPT-4o-mini

Per Dallas's analysis:

- 80% cheaper ($30/mo vs. $120/mo at 1000 plans/month)
- 4-8x faster (8-20s vs. 20-120s)
- Requires: Model switch in `services/workers/meal_plan_generator/llm_client.py` + native JSON mode

**Timeline:** Post-MVP optimization; not blocking current slowness fix

## Decision Matrix

| Scenario                       | Scale Azure | Increase CPU | Result              |
| ------------------------------ | ----------- | ------------ | ------------------- |
| Azure at capacity (full quota) | ✅          | ✅           | 4x faster, balanced |
| Azure OK, worker CPU-bound     | ❌          | ✅           | 2x faster, partial  |
| Worker OK, Azure bottleneck    | ✅          | ❌           | 2x faster, partial  |
| Both bottlenecked              | ✅          | ✅           | 4x faster, optimal  |

**Current state:** Both bottlenecked → deploy both fixes.

## Implementation Order

1. **Scale Azure** (5 min, least risk) — Capacity scales while workers continue
2. **Increase worker CPU** (5 min, restart required) — Triggers pod rolling restart
3. **Verify latency improvement** (5 min) — Check logs
4. **Alert and monitor** (10 min) — Set baseline metrics

**Total time:** 25 min. Downtime: ~2 min (pod restart window).

## Rollback Plan

- **Azure scale:** Run `./scripts/scale-kimi-k25.sh --execute` with `TARGET_CAPACITY=1` (if needed)
- **Worker CPU:** Revert kustomization patch, re-apply overlay
- **No database changes:** Fully reversible

## Success Metrics

- [ ] Worker pod CPU usage drops below 100m during idle (was throttled)
- [ ] LLM response latency improves 4x on average
- [ ] Plans complete in <30s (vs. current multi-minute)
- [ ] No pod crashes due to health probes during LLM calls
- [ ] No quota exhaustion errors from Azure

## Dependencies

- Azure CLI authentication working (`az login` status)
- Kustomize overlay changes applied before next ArgoCD sync
- No blocking issues in worker code (Dallas/Ripley to confirm)

## Risks & Mitigations

| Risk                                      | Likelihood | Mitigation                                       |
| ----------------------------------------- | ---------- | ------------------------------------------------ |
| Azure scale causes 5-min downtime         | High       | Expected; customer notification recommended      |
| Worker CPU increase causes restart storms | Low        | Health probe initialDelaySeconds=10 is safe      |
| Quota auto-limits on Azure revert change  | Very Low   | Microsoft auto-promotion is per-tier only        |
| Preview env still slow due to code issue  | Medium     | Requires Dallas/Ripley investigation in parallel |

## Approval Gate

- [ ] Ashley: Approve immediate Azure scaling (0-risk, 0-cost)
- [ ] Parker: Deploy scaling fixes and monitor logs
- [ ] Dallas: Confirm no code-level timeout issues blocking LLM calls
- [ ] Ripley: Confirm no bottlenecks in meal plan generation logic

---

**Decision Owner:** Parker  
**Last Updated:** 2026-03-06  
**Status:** Ready for approval
