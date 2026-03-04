#!/usr/bin/env bash
# =============================================================================
# Deploy Kimi K2.5 on EXISTING Azure AI Foundry account (aif-pai-dev-aue)
# =============================================================================
# Usage:
#   ./scripts/deploy-kimi-k25.sh
#
# Prerequisites:
#   - Azure CLI 2.60+ with cognitiveservices extension
#   - Logged in: az login && az account set --subscription 28aefbe7-e2af-4b4a-9ce1-92d6672c31bd
#   - Key Vault access to store secrets
#
# ⚠️  REGION NOTE: The existing account 'aif-pai-dev-aue' is in Australia East
#     (the -aue suffix = australiaeast). If you intended East US, a new account
#     in a US region would be required. This script deploys on the existing account.
#
# This script:
#   1. Deploys Kimi K2.5 on the existing Azure AI Services account
#   2. Stores the endpoint + API key in Azure Key Vault
#   3. The app picks them up via ExternalSecrets → K8s → env vars
# =============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
SUBSCRIPTION_ID="28aefbe7-e2af-4b4a-9ce1-92d6672c31bd"
RESOURCE_GROUP="rg-pai-dev-aue"
AI_LOCATION="australiaeast"  # ⚠️ Existing account region (aue = Australia East)
AI_ACCOUNT_NAME="aif-pai-dev-aue"
DEPLOYMENT_NAME="kimi-k25"
MODEL_NAME="Kimi-K2.5"
MODEL_VERSION="1"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-}"  # Set via env or auto-detect

# ── Helpers ──────────────────────────────────────────────────────────────────
log() { echo "[deploy-kimi] $*"; }
die() { echo "[deploy-kimi] ERROR: $*" >&2; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────────────────
log "Checking Azure CLI..."
az account show --query "{subscription:name, id:id}" -o table || die "Not logged in. Run: az login"
az account set --subscription "$SUBSCRIPTION_ID" || die "Failed to set subscription $SUBSCRIPTION_ID"
log "Subscription set to $SUBSCRIPTION_ID"

# Ensure cognitiveservices extension is installed
az extension add --name cognitiveservices --upgrade --yes 2>/dev/null || true

# Auto-detect Key Vault if not set
if [[ -z "$KEY_VAULT_NAME" ]]; then
  log "Auto-detecting Key Vault in resource group $RESOURCE_GROUP..."
  KEY_VAULT_NAME=$(az keyvault list \
    --resource-group "$RESOURCE_GROUP" \
    --query "[0].name" -o tsv 2>/dev/null || true)
  [[ -n "$KEY_VAULT_NAME" ]] || die "No Key Vault found in $RESOURCE_GROUP. Set KEY_VAULT_NAME env var."
  log "Found Key Vault: $KEY_VAULT_NAME"
fi

# ── Step 1: Verify AI Services account exists ───────────────────────────────
log "Verifying existing AI Services account: $AI_ACCOUNT_NAME..."
az cognitiveservices account show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "{name:name, location:location, endpoint:properties.endpoint}" \
  -o table || die "Account '$AI_ACCOUNT_NAME' not found in '$RESOURCE_GROUP'. Check subscription and resource group."
log "Account verified."

# ── Step 2: Deploy Kimi K2.5 model ──────────────────────────────────────────
log "Deploying $MODEL_NAME as '$DEPLOYMENT_NAME'..."
if az cognitiveservices account deployment show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --deployment-name "$DEPLOYMENT_NAME" &>/dev/null; then
  log "Deployment '$DEPLOYMENT_NAME' already exists, skipping."
else
  az cognitiveservices account deployment create \
    --name "$AI_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --deployment-name "$DEPLOYMENT_NAME" \
    --model-name "$MODEL_NAME" \
    --model-version "$MODEL_VERSION" \
    --model-format OpenAI \
    --sku-name "GlobalStandard" \
    --sku-capacity 1
  log "Deployment created."
fi

# ── Step 3: Retrieve endpoint and API key ────────────────────────────────────
log "Retrieving endpoint and API key..."
ENDPOINT=$(az cognitiveservices account show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.endpoint" -o tsv)

API_KEY=$(az cognitiveservices account keys list \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "key1" -o tsv)

[[ -n "$ENDPOINT" ]] || die "Failed to retrieve endpoint"
[[ -n "$API_KEY" ]] || die "Failed to retrieve API key"

log "Endpoint: $ENDPOINT"
log "API Key:  ${API_KEY:0:8}...redacted"

# ── Step 4: Store secrets in Key Vault ───────────────────────────────────────
log "Storing secrets in Key Vault: $KEY_VAULT_NAME"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "azure-openai-endpoint" \
  --value "$ENDPOINT" \
  --output none

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "azure-openai-api-key" \
  --value "$API_KEY" \
  --output none

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "azure-openai-deployment" \
  --value "$DEPLOYMENT_NAME" \
  --output none

log "Secrets stored successfully."

# ── Summary ──────────────────────────────────────────────────────────────────
cat <<EOF

═══════════════════════════════════════════════════════════════════
  Kimi K2.5 Deployment Complete!
═══════════════════════════════════════════════════════════════════

  Subscription:    $SUBSCRIPTION_ID
  Resource Group:  $RESOURCE_GROUP
  AI Account:      $AI_ACCOUNT_NAME
  Location:        $AI_LOCATION (Australia East ⚠️)
  Deployment:      $DEPLOYMENT_NAME
  Model:           $MODEL_NAME v$MODEL_VERSION
  Endpoint:        $ENDPOINT
  Key Vault:       $KEY_VAULT_NAME

  Pricing:  \$0.60/1M input tokens, \$3.00/1M output tokens (GlobalStandard)

  Next steps:
  1. Restart the worker pod to pick up new secrets:
     kubectl rollout restart deployment/meal-plan-worker -n meal-planner

  2. Worker is configured with LLM_PROVIDER=openai — uses the OpenAI-compatible
     path in llm_client.py (Kimi K2.5 is fully OpenAI API compatible via Azure AI Foundry)

  3. Verify in logs:
     kubectl logs -l app.kubernetes.io/name=meal-plan-worker -n meal-planner --tail=50

═══════════════════════════════════════════════════════════════════
EOF
