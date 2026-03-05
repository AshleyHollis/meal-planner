#!/usr/bin/env bash
# =============================================================================
# Scale Kimi K2.5 on Azure AI Foundry (East US) — Increase Deployment Capacity
# =============================================================================
# Usage:
#   ./scripts/scale-kimi-k25.sh              # Dry-run (echo command, no execute)
#   ./scripts/scale-kimi-k25.sh --execute    # Actually run the scale command
#
# Prerequisites:
#   - Azure CLI 2.60+
#   - Logged in: az login && az account set --subscription 28aefbe7-e2af-4b4a-9ce1-92d6672c31bd
#
# Capacity → TPM Mapping (GlobalStandard SKU):
#   - Capacity 1 = ~20K TPM (baseline)
#   - Capacity 2 = ~40K TPM
#   - Capacity 4 = ~80K TPM (target of this script)
#   - Capacity 8 = ~160K TPM
#   - Capacity 16 = ~320K TPM
#
# Notes:
#   - Token pricing is identical across all capacity levels (PAYGO model)
#   - Capacity increase affects throughput + latency only
#   - Expected downtime: ~5 minutes during scale operation
#   - No code changes required; redeployment picks up new capacity automatically
# =============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
SUBSCRIPTION_ID="28aefbe7-e2af-4b4a-9ce1-92d6672c31bd"
RESOURCE_GROUP="rg-pai-dev-eus"
AI_LOCATION="eastus"
AI_ACCOUNT_NAME="aif-pai-dev-eus"
DEPLOYMENT_NAME="kimi-k25"
MODEL_NAME="Kimi-K2.5"
MODEL_VERSION="1"
MODEL_FORMAT="MoonshotAI"
TARGET_CAPACITY="4"

# Parse --execute flag
EXECUTE_MODE=false
if [[ "${1:-}" == "--execute" ]]; then
  EXECUTE_MODE=true
fi

# ── Helpers ──────────────────────────────────────────────────────────────────
log() { echo "[scale-kimi] $*"; }
die() { echo "[scale-kimi] ERROR: $*" >&2; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────────────────
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Pre-flight Checks"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Checking Azure CLI..."
az account show --query "{subscription:name, id:id}" -o table || die "Not logged in. Run: az login"

log "Setting subscription..."
az account set --subscription "$SUBSCRIPTION_ID" || die "Failed to set subscription $SUBSCRIPTION_ID"
log "✓ Subscription set to $SUBSCRIPTION_ID"

log "Verifying resource group exists..."
if ! az group show --name "$RESOURCE_GROUP" &>/dev/null; then
  die "Resource group '$RESOURCE_GROUP' does not exist"
fi
log "✓ Resource group '$RESOURCE_GROUP' found"

log "Verifying AI Services account exists..."
if ! az cognitiveservices account show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  die "AI Services account '$AI_ACCOUNT_NAME' does not exist in resource group '$RESOURCE_GROUP'"
fi
log "✓ AI Services account '$AI_ACCOUNT_NAME' found"

log "Verifying deployment exists..."
CURRENT_CAPACITY=$(az cognitiveservices account deployment show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --query "properties.capabilities[0].capacity" -o tsv 2>/dev/null || echo "UNKNOWN")

if [[ "$CURRENT_CAPACITY" == "UNKNOWN" ]]; then
  die "Deployment '$DEPLOYMENT_NAME' does not exist or capacity cannot be queried"
fi
log "✓ Deployment '$DEPLOYMENT_NAME' found (current capacity: $CURRENT_CAPACITY)"

# ── Scale operation ─────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Scale Plan"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Account:          $AI_ACCOUNT_NAME"
log "Resource Group:   $RESOURCE_GROUP"
log "Deployment:       $DEPLOYMENT_NAME"
log "Current Capacity: $CURRENT_CAPACITY"
log "Target Capacity:  $TARGET_CAPACITY"
log "Expected Change:  ~$(( CURRENT_CAPACITY * 20 ))K TPM → ~$(( TARGET_CAPACITY * 20 ))K TPM"
log ""

if [[ "$EXECUTE_MODE" == false ]]; then
  log "🏃 DRY-RUN MODE (no changes made)"
  log ""
  log "Command to be executed:"
  log ""
  cat <<'CMDEND'
az cognitiveservices account deployment create \
  --name aif-pai-dev-eus \
  --resource-group rg-pai-dev-eus \
  --deployment-name kimi-k25 \
  --model-name Kimi-K2.5 \
  --model-version 1 \
  --model-format MoonshotAI \
  --sku-name GlobalStandard \
  --sku-capacity 4
CMDEND
  log ""
  log "To actually scale, run:"
  log "  $0 --execute"
  log ""
  exit 0
fi

# ── Execute scale ───────────────────────────────────────────────────────────
log "🚀 EXECUTE MODE"
log ""
log "Scaling deployment '$DEPLOYMENT_NAME' from capacity $CURRENT_CAPACITY to $TARGET_CAPACITY..."
log "⏱️  This may take 3-5 minutes. Do NOT interrupt."
log ""

az cognitiveservices account deployment create \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --model-name "$MODEL_NAME" \
  --model-version "$MODEL_VERSION" \
  --model-format "$MODEL_FORMAT" \
  --sku-name "GlobalStandard" \
  --sku-capacity "$TARGET_CAPACITY" || die "Failed to scale deployment"

log ""
log "✓ Scale command executed successfully"

# ── Post-flight verification ────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Post-flight Verification"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log "Retrieving updated deployment info..."
UPDATED_CAPACITY=$(az cognitiveservices account deployment show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" \
  --query "properties.capabilities[0].capacity" -o tsv 2>/dev/null || echo "UNKNOWN")

if [[ "$UPDATED_CAPACITY" == "UNKNOWN" ]]; then
  log "⚠️  WARNING: Could not verify new capacity (check Azure Portal manually)"
else
  log "New Capacity:   $UPDATED_CAPACITY"

  if [[ "$UPDATED_CAPACITY" == "$TARGET_CAPACITY" ]]; then
    log "✓ Capacity successfully scaled to $TARGET_CAPACITY (~$(( TARGET_CAPACITY * 20 ))K TPM)"
  else
    log "⚠️  Capacity appears to be $UPDATED_CAPACITY (expected $TARGET_CAPACITY)"
    log "    Scaling may still be in progress. Check Azure Portal."
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────
log ""
cat <<'EOF'
═══════════════════════════════════════════════════════════════════
  Kimi K2.5 Scale Complete!
═══════════════════════════════════════════════════════════════════

  Subscription:    28aefbe7-e2af-4b4a-9ce1-92d6672c31bd
  Resource Group:  rg-pai-dev-eus
  AI Account:      aif-pai-dev-eus
  Deployment:      kimi-k25
  Model:           Kimi-K2.5 v1

  Pricing Impact:     None (PAYGO token cost unchanged)
  Latency Impact:     Improved (4x higher throughput)

  Next steps:
  1. Worker pods continue using existing credentials (no restart needed).
  2. Monitor API latency in worker logs:
     kubectl logs -l app.kubernetes.io/name=meal-plan-worker \
       -n meal-planner --tail=100 | grep -i "duration\|latency"

  3. For quota monitoring:
     ./scripts/check-kimi-quota.sh

═══════════════════════════════════════════════════════════════════
EOF
