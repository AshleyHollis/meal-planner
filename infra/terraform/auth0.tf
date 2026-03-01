# =============================================================================
# Auth0 Configuration
# =============================================================================
# Creates meal-planner's own Auth0 applications (prod + preview) with correct
# callback URLs. Stores credentials in Key Vault with meal-planner- prefix to
# avoid conflicts with yt-summarizer's secrets in the shared kv-ytsumm-prd.

# -----------------------------------------------------------------------------
# Generate random session secrets
# -----------------------------------------------------------------------------
resource "random_password" "auth0_session_secret" {
  length  = 32
  special = true
}

resource "random_password" "auth0_preview_session_secret" {
  length  = 32
  special = true
}

# -----------------------------------------------------------------------------
# Generate random passwords for test users
# -----------------------------------------------------------------------------
resource "random_password" "admin_test_password" {
  length  = 24
  special = true
  lower   = true
  upper   = true
  numeric = true
}

resource "random_password" "normal_test_password" {
  length  = 24
  special = true
  lower   = true
  upper   = true
  numeric = true
}

# -----------------------------------------------------------------------------
# Create Auth0 Application (Production)
# -----------------------------------------------------------------------------
module "auth0" {
  count  = var.enable_auth0 ? 1 : 0
  source = "./modules/auth0"

  auth0_domain          = var.auth0_domain
  application_name      = var.auth0_application_name
  allowed_callback_urls = var.auth0_allowed_callback_urls
  allowed_logout_urls   = var.auth0_allowed_logout_urls
  allowed_web_origins   = var.auth0_allowed_web_origins

  # Reuse tenant's existing database connection (created by yt-summarizer)
  enable_database_connection = false
  enable_google_connection   = false
  enable_github_connection   = false

  # No test users via module (created separately below with explicit connection_name)
  test_users         = {}
  enable_role_action = false
}

# -----------------------------------------------------------------------------
# Create Auth0 Application for Preview Environments
# -----------------------------------------------------------------------------
module "auth0_preview" {
  count  = var.enable_auth0 ? 1 : 0
  source = "./modules/auth0"

  auth0_domain          = var.auth0_domain
  application_name      = "${var.auth0_application_name}-preview"
  allowed_callback_urls = var.auth0_preview_allowed_callback_urls
  allowed_logout_urls   = var.auth0_preview_allowed_logout_urls
  allowed_web_origins   = var.auth0_preview_allowed_web_origins

  # Share connections with production (don't create duplicates)
  enable_database_connection = false
  enable_google_connection   = false
  enable_github_connection   = false

  # No test users or actions for preview app
  test_users         = {}
  enable_role_action = false
}

# -----------------------------------------------------------------------------
# Enable existing database connection for meal-planner apps
# -----------------------------------------------------------------------------
# The Auth0 tenant already has a Username-Password-Authentication connection
# (created by yt-summarizer). We need to add meal-planner's apps as enabled
# clients on that connection using the singular auth0_connection_client resource
# which manages individual client-connection pairs without affecting other clients.

data "auth0_connection" "database" {
  count = var.enable_auth0 ? 1 : 0
  name  = "Username-Password-Authentication"
}

resource "auth0_connection_client" "meal_planner_database" {
  count         = var.enable_auth0 ? 1 : 0
  connection_id = data.auth0_connection.database[0].id
  client_id     = module.auth0[0].application_client_id
}

resource "auth0_connection_client" "meal_planner_preview_database" {
  count         = var.enable_auth0 ? 1 : 0
  connection_id = data.auth0_connection.database[0].id
  client_id     = module.auth0_preview[0].application_client_id
}

# -----------------------------------------------------------------------------
# Test users (created directly, not via module, since we don't own the connection)
# -----------------------------------------------------------------------------
resource "auth0_user" "admin_test_user" {
  count = var.enable_auth0 ? 1 : 0

  connection_name = "Username-Password-Authentication"
  email           = "admin@test.meal-planner.internal"
  password        = random_password.admin_test_password.result
  email_verified  = true

  app_metadata = jsonencode({
    role = "admin"
  })

  depends_on = [
    auth0_connection_client.meal_planner_database
  ]

  lifecycle {
    ignore_changes = [password]
  }
}

resource "auth0_user" "normal_test_user" {
  count = var.enable_auth0 ? 1 : 0

  connection_name = "Username-Password-Authentication"
  email           = "user@test.meal-planner.internal"
  password        = random_password.normal_test_password.result
  email_verified  = true

  app_metadata = jsonencode({
    role = "user"
  })

  depends_on = [
    auth0_connection_client.meal_planner_database
  ]

  lifecycle {
    ignore_changes = [password]
  }
}

# -----------------------------------------------------------------------------
# Store Auth0 Production Credentials in Azure Key Vault
# -----------------------------------------------------------------------------
resource "azurerm_key_vault_secret" "auth0_domain" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-domain"
  value        = module.auth0[0].auth0_domain
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_client_id" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-client-id"
  value        = module.auth0[0].application_client_id
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_client_secret" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-client-secret"
  value        = module.auth0[0].application_client_secret
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_session_secret" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-session-secret"
  value        = random_password.auth0_session_secret.result
  key_vault_id = module.shared.key_vault_id
}

# -----------------------------------------------------------------------------
# Store Auth0 Preview Credentials in Azure Key Vault
# -----------------------------------------------------------------------------
resource "azurerm_key_vault_secret" "auth0_preview_domain" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-preview-domain"
  value        = module.auth0_preview[0].auth0_domain
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_preview_client_id" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-preview-client-id"
  value        = module.auth0_preview[0].application_client_id
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_preview_client_secret" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-preview-client-secret"
  value        = module.auth0_preview[0].application_client_secret
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_preview_session_secret" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-preview-session-secret"
  value        = random_password.auth0_preview_session_secret.result
  key_vault_id = module.shared.key_vault_id
}

# -----------------------------------------------------------------------------
# Store Test User Credentials in Azure Key Vault
# -----------------------------------------------------------------------------
resource "azurerm_key_vault_secret" "auth0_admin_test_email" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-admin-test-email"
  value        = "admin@test.meal-planner.internal"
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_admin_test_password" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-admin-test-password"
  value        = random_password.admin_test_password.result
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_user_test_email" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-user-test-email"
  value        = "user@test.meal-planner.internal"
  key_vault_id = module.shared.key_vault_id
}

resource "azurerm_key_vault_secret" "auth0_user_test_password" {
  count        = var.enable_auth0 ? 1 : 0
  name         = "meal-planner-auth0-user-test-password"
  value        = random_password.normal_test_password.result
  key_vault_id = module.shared.key_vault_id
}
