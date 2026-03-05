#!/usr/bin/env bash
# =============================================================================
# Provision a per-PR preview database
# =============================================================================
# Creates an Azure SQL database and Key Vault secret for a specific PR.
# Idempotent: safe to run multiple times for the same PR.
#
# Required environment variables:
#   PR_NUMBER              - Pull request number
#   AZURE_SQL_SERVER       - SQL server name (e.g. sql-mealplan-prd)
#   AZURE_RESOURCE_GROUP   - Resource group containing the SQL server
#   KEY_VAULT_NAME         - Key Vault name (e.g. kv-ytsumm-prd-ci)
#   SQL_ADMIN_USERNAME     - SQL admin username
#   SQL_ADMIN_PASSWORD     - SQL admin password
# =============================================================================
set -euo pipefail

# Validate required variables
for var in PR_NUMBER AZURE_SQL_SERVER AZURE_RESOURCE_GROUP KEY_VAULT_NAME SQL_ADMIN_USERNAME SQL_ADMIN_PASSWORD; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Required variable ${var} is not set"
    exit 1
  fi
done

DB_NAME="mealplanner-pr-${PR_NUMBER}"
SECRET_NAME="meal-planner-sql-connection-string-pr-${PR_NUMBER}"

echo "🔧 Provisioning preview database for PR #${PR_NUMBER}..."
echo "   Database: ${DB_NAME}"
echo "   Secret:   ${SECRET_NAME}"

# Get the SQL server FQDN
SQL_FQDN=$(az sql server show \
  --name "${AZURE_SQL_SERVER}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --query "fullyQualifiedDomainName" \
  --output tsv)

echo "   Server:   ${SQL_FQDN}"

# Create database if it doesn't exist (serverless, matching production SKU)
if az sql db show --name "${DB_NAME}" --server "${AZURE_SQL_SERVER}" --resource-group "${AZURE_RESOURCE_GROUP}" &>/dev/null; then
  echo "ℹ️  Database ${DB_NAME} already exists"
else
  echo "📦 Creating database ${DB_NAME}..."
  az sql db create \
    --name "${DB_NAME}" \
    --server "${AZURE_SQL_SERVER}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --edition GeneralPurpose \
    --family Gen5 \
    --capacity 1 \
    --compute-model Serverless \
    --auto-pause-delay 60 \
    --max-size 2GB \
    --zone-redundant false \
    --backup-storage-redundancy Local \
    --yes \
    --output none
  echo "✅ Database ${DB_NAME} created"
fi

# Build connection string
CONNECTION_STRING="Server=tcp:${SQL_FQDN},1433;Initial Catalog=${DB_NAME};User ID=${SQL_ADMIN_USERNAME};Password=${SQL_ADMIN_PASSWORD};Encrypt=True;TrustServerCertificate=False;Connection Timeout=120;"

# Create/update Key Vault secret
echo "🔑 Setting Key Vault secret ${SECRET_NAME}..."
az keyvault secret set \
  --vault-name "${KEY_VAULT_NAME}" \
  --name "${SECRET_NAME}" \
  --value "${CONNECTION_STRING}" \
  --output none
echo "✅ Key Vault secret ${SECRET_NAME} set"

echo "✅ Preview database provisioned for PR #${PR_NUMBER}"
