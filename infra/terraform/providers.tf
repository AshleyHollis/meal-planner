# =============================================================================
# Terraform Settings and Provider Configuration
# =============================================================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.57.0, < 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    auth0 = {
      source  = "auth0/auth0"
      version = ">= 1.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
  subscription_id = var.subscription_id
}

provider "auth0" {
  # Uses AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET environment variables.
}
