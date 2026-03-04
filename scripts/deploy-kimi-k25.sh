#!/usr/bin/env bash
# =============================================================================
# Deploy Kimi K2.5 on Azure AI Foundry (US region, serverless pay-per-token)
# =============================================================================
# Usage:
#   ./scripts/deploy-kimi-k25.sh
#
# Prerequisites:
#   - Azure CLI 2.60+ with cognitiveservices extension
#   - Logged in: az login && az account set --subscription <sub-id>
#   - Key Vault access to store secrets
#
# This script:
#   1. Creates an Azure AI Services account in a US region (westus)
#   2. Deploys Kimi K2.5 as a serverless (pay-per-token) model
#   3. Stores the endpoint + API key in Azure Key Vault
#   4. The app picks them up via ExternalSecrets → K8s → env vars
# =============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-ytsumm-prd}"
AI_LOCATION="westus"  # US region for AI Foundry
AI_ACCOUNT_NAME="mealplan-ai-westus"
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

# ── Step 1: Create AI Services account (if not exists) ──────────────────────
log "Creating Azure AI Services account: $AI_ACCOUNT_NAME in $AI_LOCATION..."
if az cognitiveservices account show \
  --name "$AI_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" &>/dev/null; then
  log "AI Services account already exists, skipping creation."
else
  az cognitiveservices account create \
    --name "$AI_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$AI_LOCATION" \
    --kind AIServices \
    --sku S0 \
    --custom-domain "$AI_ACCOUNT_NAME" \
    --yes
  log "AI Services account created."
fi

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
    --sku-name Standard \
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

  Resource Group:  $RESOURCE_GROUP
  AI Account:      $AI_ACCOUNT_NAME
  Location:        $AI_LOCATION (US)
  Deployment:      $DEPLOYMENT_NAME
  Model:           $MODEL_NAME v$MODEL_VERSION
  Endpoint:        $ENDPOINT
  Key Vault:       $KEY_VAULT_NAME

  Pricing:  \$0.60/1M input tokens, \$3.00/1M output tokens

  Next steps:
  1. Restart the worker pod to pick up new secrets:
     kubectl rollout restart deployment/worker -n meal-planner

  2. The app will auto-detect Azure OpenAI config and use it
     (llm_client.py prefers Azure when AZURE_OPENAI_ENDPOINT is set)

  3. Verify in logs:
     kubectl logs -l app=worker -n meal-planner --tail=50

═══════════════════════════════════════════════════════════════════
EOF
