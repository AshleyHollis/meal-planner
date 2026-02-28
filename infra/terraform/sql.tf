# =============================================================================
# Azure SQL Database (Serverless)
# =============================================================================
# App-specific SQL Server and database for meal-planner

resource "azurerm_mssql_server" "sql" {
  name                         = "sql-${local.name_prefix}"
  resource_group_name          = data.azurerm_resource_group.shared.name
  location                     = data.azurerm_resource_group.shared.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  tags = local.common_tags
}

resource "azurerm_mssql_database" "db" {
  name      = "mealplanner"
  server_id = azurerm_mssql_server.sql.id

  # Serverless General Purpose - auto-pauses when idle
  sku_name                    = "GP_S_Gen5_1"
  max_size_gb                 = 32
  min_capacity                = 0.5
  auto_pause_delay_in_minutes = 60

  zone_redundant = false

  tags = local.common_tags
}

# Allow Azure services (AKS) to access the SQL server
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.sql.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "sql_server_fqdn" {
  description = "SQL Server fully qualified domain name"
  value       = azurerm_mssql_server.sql.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "SQL database name"
  value       = azurerm_mssql_database.db.name
}

output "sql_connection_string" {
  description = "ADO.NET connection string for the database"
  value       = "Server=tcp:${azurerm_mssql_server.sql.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.db.name};User ID=${var.sql_admin_username};Password=${var.sql_admin_password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
  sensitive   = true
}
