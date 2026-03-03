#!/usr/bin/env bash
# =============================================================================
# Clean up per-PR preview database
# =============================================================================
# Deletes the Azure SQL database and Key Vault secret for a closed PR.
# Idempotent: safe to run even if resources don't exist.
#
# Required environment variables:
#   PR_NUMBER              - Pull request number
#   AZURE_SQL_SERVER       - SQL server name (e.g. sql-mealplan-prd)
#   AZURE_RESOURCE_GROUP   - Resource group containing the SQL server
#   KEY_VAULT_NAME         - Key Vault name (e.g. kv-ytsumm-prd)
# =============================================================================
set -euo pipefail

for var in PR_NUMBER AZURE_SQL_SERVER AZURE_RESOURCE_GROUP KEY_VAULT_NAME; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Required variable ${var} is not set"
    exit 1
  fi
done

DB_NAME="mealplanner-pr-${PR_NUMBER}"
SECRET_NAME="meal-planner-sql-connection-string-pr-${PR_NUMBER}"

echo "🗑️  Cleaning up preview database for PR #${PR_NUMBER}..."

# Delete database if it exists
if az sql db show --name "${DB_NAME}" --server "${AZURE_SQL_SERVER}" --resource-group "${AZURE_RESOURCE_GROUP}" &>/dev/null; then
  echo "📦 Deleting database ${DB_NAME}..."
  az sql db delete \
    --name "${DB_NAME}" \
    --server "${AZURE_SQL_SERVER}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --yes \
    --output none
  echo "✅ Database ${DB_NAME} deleted"
else
  echo "ℹ️  Database ${DB_NAME} does not exist, skipping"
fi

# Delete Key Vault secret if it exists
if az keyvault secret show --vault-name "${KEY_VAULT_NAME}" --name "${SECRET_NAME}" &>/dev/null; then
  echo "🔑 Deleting Key Vault secret ${SECRET_NAME}..."
  az keyvault secret delete \
    --vault-name "${KEY_VAULT_NAME}" \
    --name "${SECRET_NAME}" \
    --output none
  echo "✅ Key Vault secret ${SECRET_NAME} deleted"
else
  echo "ℹ️  Key Vault secret ${SECRET_NAME} does not exist, skipping"
fi

echo "✅ Preview database cleanup complete for PR #${PR_NUMBER}"
