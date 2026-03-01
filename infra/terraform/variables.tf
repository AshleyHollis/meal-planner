# =============================================================================
# Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Azure
# -----------------------------------------------------------------------------

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastasia"
}

# -----------------------------------------------------------------------------
# SQL Database
# -----------------------------------------------------------------------------

variable "sql_admin_username" {
  description = "SQL Server admin username"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "SQL Server admin password"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------------
# LLM
# -----------------------------------------------------------------------------

variable "llm_api_key" {
  description = "LLM API key (Anthropic or OpenAI)"
  type        = string
  sensitive   = true
  default     = ""
}

# -----------------------------------------------------------------------------
# Naming / Tags
# -----------------------------------------------------------------------------

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

locals {
  name_prefix = "mealplan-prd"

  common_tags = {
    Environment = var.environment
    Project     = "meal-planner"
    ManagedBy   = "terraform"
  }
}
