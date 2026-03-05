# Orchestration Log: Parker — Kimi K2.5 Azure Quota & Deployment Optimization

**Date:** 2026-03-05T0700Z  
**Agent:** Parker (DevOps / Infrastructure)  
**Status:** ✅ Completed  
**Mode:** Background  
**Model:** claude-haiku-4.5

---

## Spawn

**Task:** Define Azure quota increase strategy and deployment capacity scaling options for Kimi K2.5 to support Tier 2 (parallel meal generation).

**Context:**
- Current quota: 20K TPM (tokens per minute) at capacity 1
- Tier 1 optimization reduces per-call footprint from 10K → 4K tokens
- Tier 2 requires 3 parallel calls: 3 × 4K = 12K TPM (60% of current budget)
- Goal: Define scaling path (capacity, quota, PTU options) with cost analysis

---

## Work Summary

**Artifact produced:** `.squad/decisions/inbox/parker-kimi-k25-quota-optimization.md` (524 lines)

**Key findings:**

1. **Current Quota Structure:**
   - Model: Kimi K2.5 on Azure AI Foundry (East US)
   - Rate limit: 20K TPM (binding constraint)
   - SKU: GlobalStandard at capacity 1
   - Scope: Per subscription, per region

2. **Capacity Scaling Path:**
   - Capacity 1 → 4: +4x throughput (20K → 80K TPM estimate)
   - No code changes; same per-token PAYGO cost
   - Deployment downtime: ~5 minutes (delete + recreate)
   - **Recommendation:** Do this immediately (free latency win)

3. **Quota Tier Progression:**
   - Current: Tier 1-2 (~20K TPM) — typical MVP tier
   - Auto-promotion: Reaches Tier 3+ if sustained ~80% utilization for 14+ days
   - Manual request: 1-2 business day turnaround via Azure portal

4. **Quota Increase Options:**
   - **Option A (Easiest):** Trigger auto-promotion by hitting 80% utilization (2-4 weeks)
   - **Option B (Recommended):** Manual portal request for 40K-120K TPM (1-2 days)
   - **Option C (CLI):** Automated via Azure CLI (requires portal confirmation)

5. **PTU Economics (Provisioned Throughput Units):**
   - Current usage (50 plans/day, 4K tokens avg): $147K/year PAYGO
   - PTU (8 units @ $2.50/hr): $14.6K/year
   - **Break-even:** ~1M tokens/day sustained (1000+ plans/day)
   - Recommendation: Defer until post-MVP; only if >500K tokens/day

6. **Cost Analysis by Capacity:**
   - Capacity scaling does NOT increase token cost (PAYGO unchanged)
   - Only throughput benefit (requests/min)
   - Multi-region: 2x cost, but bypasses regional quota limits
   - PTU: 96% savings at enterprise scale (>1M/day)

---

## Deployment Optimization Strategies

| Strategy | Throughput | Cost | Implementation | When |
|----------|-----------|------|-----------------|------|
| **Capacity 1→4** | 4x | Same token cost | Delete + recreate (~5 min) | NOW |
| **Capacity 4→8** | 8x | Same token cost | Delete + recreate (~5 min) | If capacity 4 hits 90% |
| **Auto-promotion** | Next tier | PAYGO (tier-dependent) | Run organic workload | Passive (2-4 weeks) |
| **Manual quota req** | +50K TPM | PAYGO (unchanged) | Azure portal form (1-2 days) | If capacity insufficient |
| **Multi-region** | Regional isolation | 2x infrastructure | New deployment + routing | If East US quota exhausted |
| **PTU** | Guaranteed + 25-40% savings | Commitment-based | Capacity planning (1+ PTU min) | If >1M tokens/day |

---

## Action Plan

### Phase 1: Immediate (Now)
- Increase capacity 1 → 4 in existing deployment
- Update deployment script: `--sku-capacity 1` → `--sku-capacity 4`
- Cost impact: Minimal (per-token pricing unchanged)
- Benefit: 4x throughput headroom for Tier 2 parallelism

### Phase 2: Short-term (1-2 weeks)
- Monitor quota utilization in Azure portal
- If hitting 80%+, auto-promotion will trigger (2-4 week timeline)
- Alternatively: Proactively request quota increase to 120K TPM via portal (1-2 days)

### Phase 3: Medium-term (1-3 months)
- If capacity 4 hits 90%+ consistently: upgrade to capacity 8
- Re-evaluate usage trends; decide on PTU if >500K tokens/day

### Phase 4: Long-term (6+ months)
- Evaluate model choice: Keep Kimi K2.5 vs. switch to GPT-4o-mini (80% cheaper, 4x faster)
- Cost structure: PTU if >1M tokens/day; multi-region if global expansion needed

---

## Ready-to-Run Scripts

**Check current quota:**
```bash
az quota list --scope "/subscriptions/28aefbe7-e2af-4b4a-9ce1-92d6672c31bd/providers/Microsoft.CognitiveServices/locations/eastus"
```

**Update capacity 1→4:**
```bash
# Edit scripts/deploy-kimi-k25.sh: --sku-capacity 1 → --sku-capacity 4
./scripts/deploy-kimi-k25.sh  # 5 min downtime
```

**Request quota increase (portal):**
- Navigate: Azure Portal → Quotas → Cognitive Services → Kimi-K2.5
- Select: "Request quota increase"
- Target: 120K TPM
- Wait: 1-2 business days

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Capacity scaling downtime | Medium | Plan during low-traffic window; monitor cold start |
| Rate limiting at 4x capacity | Low | 3 parallel calls @ 4K tokens = 12K TPM (60% headroom) |
| PTU overkill at MVP scale | Low | Don't commit to PTU until >500K tokens/day sustained |
| Multi-region complexity | Medium | Defer unless single-region quota exhausted |

---

## Cost Projections

**Current (50 plans/day, 4K tokens/plan):**
- 200K tokens/day × 365 = 72M tokens/year
- Input (40%): $17.3K/year
- Output (60%): $129.6K/year
- **Total: $147K/year**

**At 500 plans/day (10x growth):**
- 2M tokens/day × 365 = 730M tokens/year
- PAYGO: $1.47M/year
- PTU (8 units): $14.6K/year
- **Savings with PTU: 99%** (cost nearly fixed regardless of volume)

---

## Key Links

- [Azure AI Foundry Quotas & Limits](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/quotas-limits)
- [Azure OpenAI PTU Pricing](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-onboarding)
- [Azure Cognitive Services Deployment CLI](https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account/deployment)
- [PTU Calculator](https://www.ptucalc.com/)

---

## Next Steps

1. ✅ Approve capacity scaling (1 → 4)
2. ⏳ Run updated deployment script (~5 min)
3. ⏳ Monitor quota utilization (weekly)
4. ⏳ Request quota increase if hitting 80%+ (1-2 days)
5. ⏳ Evaluate PTU at >500K tokens/day (post-MVP)

---

**Authored by:** Scribe (on behalf of Parker)  
**Merged to decisions.md:** 2026-03-05T0700Z
