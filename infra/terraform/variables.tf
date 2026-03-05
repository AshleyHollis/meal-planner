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
  default     = "centralindia"
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
# Auth0
# -----------------------------------------------------------------------------

variable "enable_auth0" {
  description = "Enable Auth0 resources (requires proper Auth0 Management API permissions)"
  type        = bool
  default     = true
}

variable "auth0_domain" {
  description = "Auth0 tenant domain (e.g., yourapp.us.auth0.com). Read from AUTH0_DOMAIN environment variable."
  type        = string
  default     = ""
}

variable "auth0_terraform_client_id" {
  description = "Auth0 Terraform service account client ID (for enabling connection access)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "auth0_application_name" {
  description = "Auth0 application name for the API BFF"
  type        = string
  default     = "meal-planner-api-bff"
}

variable "auth0_allowed_callback_urls" {
  description = "Allowed Auth0 callback URLs for the BFF"
  type        = list(string)
  default = [
    "https://meal-planner.apps.ashleyhollis.com/api/auth/callback",
    "http://localhost:3000/api/auth/callback",
  ]
}

variable "auth0_allowed_logout_urls" {
  description = "Allowed Auth0 logout URLs for the BFF"
  type        = list(string)
  default = [
    "https://meal-planner.apps.ashleyhollis.com",
    "https://*.azurestaticapps.net",
    "http://localhost:3000",
  ]
}

variable "auth0_allowed_web_origins" {
  description = "Allowed Auth0 web origins for CORS/session flows"
  type        = list(string)
  default = [
    "https://meal-planner.apps.ashleyhollis.com",
    "https://*.azurestaticapps.net",
    "http://localhost:3000",
  ]
}

# -----------------------------------------------------------------------------
# Preview Auth0 Application Variables
# -----------------------------------------------------------------------------

variable "auth0_preview_allowed_callback_urls" {
  description = "Allowed Auth0 callback URLs for preview environments"
  type        = list(string)
  default = [
    "https://pr-*.meal-planner.apps.ashleyhollis.com/api/auth/callback",
    "https://*.eastasia.6.azurestaticapps.net/api/auth/callback",
  ]
}

variable "auth0_preview_allowed_logout_urls" {
  description = "Allowed Auth0 logout URLs for preview environments"
  type        = list(string)
  default = [
    "https://*.eastasia.6.azurestaticapps.net",
  ]
}

variable "auth0_preview_allowed_web_origins" {
  description = "Allowed Auth0 web origins for preview environments"
  type        = list(string)
  default = [
    "https://*.eastasia.6.azurestaticapps.net",
  ]
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
