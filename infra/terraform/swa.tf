# =============================================================================
# Azure Static Web App
# =============================================================================
# Next.js frontend hosted on Azure Static Web Apps

resource "azurerm_static_web_app" "swa" {
  name                = "swa-${local.name_prefix}"
  resource_group_name = data.azurerm_resource_group.shared.name
  location            = data.azurerm_resource_group.shared.location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "swa_default_host_name" {
  description = "Static Web App default hostname"
  value       = azurerm_static_web_app.swa.default_host_name
}

output "swa_api_key" {
  description = "Static Web App deployment API key (for GitHub Actions)"
  value       = azurerm_static_web_app.swa.api_key
  sensitive   = true
}
