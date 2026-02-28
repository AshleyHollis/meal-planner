# =============================================================================
# Key Vault Secrets
# =============================================================================
# Store meal-planner secrets in the shared Key Vault

data "azurerm_resource_group" "shared" {
  name = var.shared_resource_group_name
}

data "azurerm_key_vault" "shared" {
  name                = var.shared_key_vault_name
  resource_group_name = data.azurerm_resource_group.shared.name
}

# SQL connection string
resource "azurerm_key_vault_secret" "sql_connection" {
  name         = "meal-planner-sql-connection-string"
  value        = "Server=tcp:${azurerm_mssql_server.sql.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.db.name};User ID=${var.sql_admin_username};Password=${var.sql_admin_password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  key_vault_id = data.azurerm_key_vault.shared.id
}

# Storage connection string
resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "meal-planner-storage-connection"
  value        = azurerm_storage_account.storage.primary_connection_string
  key_vault_id = data.azurerm_key_vault.shared.id
}

# LLM API key (if provided)
resource "azurerm_key_vault_secret" "llm_api_key" {
  count        = var.llm_api_key != "" ? 1 : 0
  name         = "meal-planner-llm-api-key"
  value        = var.llm_api_key
  key_vault_id = data.azurerm_key_vault.shared.id
}
