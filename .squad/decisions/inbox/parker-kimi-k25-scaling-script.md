# Decision: Kimi K2.5 Capacity Scaling via Automated Script

**Date:** 2026-03-06  
**Owner:** Parker (DevOps)  
**Status:** ✅ IMPLEMENTED  
**Impact:** Production infrastructure automation

## Problem

Ashley requested a reliable, safe way to scale Kimi K2.5 deployment capacity on Azure AI Foundry from current (capacity 1 = ~20K TPM) to target (capacity 4 = ~80K TPM) without manual Azure Portal clicks.

## Decision

**Create `scripts/scale-kimi-k25.sh`** — A production-grade Azure CLI automation script with:
- **Dry-run by default** (no execute without explicit `--execute` flag)
- **Pre-flight validation** (az login, resource group, AI account, deployment existence)
- **Post-flight verification** (query and confirm new capacity)
- **Clear documentation** of capacity ↔ TPM mapping + cost implications

### Why This Approach

1. **Safety-first design:** Dry-run prevents accidental infrastructure changes
2. **Transparency:** User sees exact `az` command before it runs
3. **Idempotent:** Uses `deployment create` (which also updates existing)
4. **Minimal friction:** Single command replaces manual Portal navigation
5. **Auditable:** Script is version-controlled, commit history shows who scaled what when

## Technical Details

### Capacity Scaling Model
- **Current:** Capacity 1 = ~20K TPM
- **Target:** Capacity 4 = ~80K TPM (4x throughput)
- **Cost impact:** None (PAYGO token pricing unchanged; only throughput changes)
- **Downtime:** ~5 minutes during scale operation
- **Code changes required:** None (worker pods continue using same credentials)

### Azure CLI Command
```bash
az cognitiveservices account deployment create \
  --name aif-pai-dev-eus \
  --resource-group rg-pai-dev-eus \
  --deployment-name kimi-k25 \
  --model-name Kimi-K2.5 \
  --model-version 1 \
  --model-format MoonshotAI \
  --sku-name GlobalStandard \
  --sku-capacity 4
```

**Note:** `deployment create` is idempotent — running it on an existing deployment updates capacity without recreating.

### Script Behavior

#### Dry-Run (Default)
```bash
./scripts/scale-kimi-k25.sh
# Outputs:
# - All pre-flight checks ✓
# - Current capacity (e.g., 1)
# - Azure CLI command that WOULD run
# - Instruction to add --execute flag
```

#### Execute
```bash
./scripts/scale-kimi-k25.sh --execute
# Runs the actual `az cognitiveservices account deployment create`
# Waits for completion
# Verifies new capacity matches target
```

## Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| Manual Portal clicks | No automation risk | Manual, error-prone, not auditable |
| Terraform module | IaC gold standard | Requires shared-infra code change, slower review |
| **Automated script (chosen)** | Fast, transparent, version-controlled | Still requires human approval (--execute) |
| GitHub Actions workflow | Fully automated | Overkill for one-time scaling task |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Script runs without approval | Dry-run default requires explicit `--execute` flag |
| Azure state changes unexpectedly | Pre-flight checks validate assumptions |
| Capacity scaling fails silently | Post-flight verification queries Azure state |
| User uncertain about impact | Comments explain TPM/cost mapping, expected downtime |

## Next Steps

1. **Run the script:** `./scripts/scale-kimi-k25.sh --execute` (on-demand, only when scaling is needed)
2. **Monitor latency:** Watch worker pod logs for improved request duration
3. **Check quota tier:** Use `./scripts/check-kimi-quota.sh` (separate monitoring script) to track quota usage

## Files Changed

- `scripts/scale-kimi-k25.sh`: New script (193 lines)
- Commit: 5a41b70

## Team Consensus

✅ Approach aligns with Parker's systematic style: "Checks logs first, deploys second. Trusts the pipeline, not assumptions."

- Pre-flight checks validate state before changes
- Post-flight verification confirms success
- Dry-run default enables manual approval
