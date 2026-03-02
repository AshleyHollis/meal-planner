# =============================================================================
# Azure Storage Account (Queue)
# =============================================================================
# App-specific storage for meal plan job queue

resource "azurerm_storage_account" "storage" {
  name                     = replace("st${local.name_prefix}", "-", "")
  resource_group_name      = module.shared.resource_group_name
  location                 = module.shared.resource_group_location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  allow_nested_items_to_be_public = false

  tags = local.common_tags
}

# Meal plan generation job queue
resource "azurerm_storage_queue" "meal_plan_jobs" {
  name               = "meal-plan-jobs"
  storage_account_id = azurerm_storage_account.storage.id
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.storage.name
}

output "storage_primary_connection_string" {
  description = "Storage account primary connection string"
  value       = azurerm_storage_account.storage.primary_connection_string
  sensitive   = true
}

output "storage_primary_queue_endpoint" {
  description = "Storage account primary queue endpoint"
  value       = azurerm_storage_account.storage.primary_queue_endpoint
}
