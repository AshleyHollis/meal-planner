# =============================================================================
# Terraform Backend Configuration
# =============================================================================
# Stores Terraform state in Azure Blob Storage (shared state account)
# Authentication:
# - Local: uses Azure CLI credentials (az login)
# - CI/CD: uses OIDC via ARM_USE_OIDC=true environment variable

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-ytsummarizer-tfstate"
    storage_account_name = "stytsummarizertfstate"
    container_name       = "tfstate"
    key                  = "meal-planner.tfstate"
    use_oidc             = true
  }
}
