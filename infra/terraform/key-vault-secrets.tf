# =============================================================================
# Key Vault Secrets
# =============================================================================
# Store meal-planner secrets in the shared Key Vault

# SQL connection string
resource "azurerm_key_vault_secret" "sql_connection" {
  name         = "meal-planner-sql-connection-string"
  value        = "Server=tcp:${azurerm_mssql_server.sql.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.db.name};User ID=${var.sql_admin_username};Password=${var.sql_admin_password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  key_vault_id = module.shared.key_vault_id
}

# Storage connection string
resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "meal-planner-storage-connection"
  value        = azurerm_storage_account.storage.primary_connection_string
  key_vault_id = module.shared.key_vault_id
}

# LLM API key (if provided)
resource "azurerm_key_vault_secret" "llm_api_key" {
  count        = var.llm_api_key != "" ? 1 : 0
  name         = "meal-planner-llm-api-key"
  value        = var.llm_api_key
  key_vault_id = module.shared.key_vault_id
}

# =============================================================================
# Auth0 Secrets
# =============================================================================
# Required by k8s/base/externalsecret-auth0.yaml (ExternalSecret → K8s Secret)

resource "azurerm_key_vault_secret" "auth0_domain" {
  count        = var.auth0_domain != "" ? 1 : 0
  name         = "auth0-domain"
  value        = var.auth0_domain
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_client_id" {
  count        = var.auth0_client_id != "" ? 1 : 0
  name         = "auth0-client-id"
  value        = var.auth0_client_id
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_client_secret" {
  count        = var.auth0_client_secret != "" ? 1 : 0
  name         = "auth0-client-secret"
  value        = var.auth0_client_secret
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_session_secret" {
  count        = var.auth0_session_secret != "" ? 1 : 0
  name         = "auth0-session-secret"
  value        = var.auth0_session_secret
  key_vault_id = module.shared.key_vault_id
}
