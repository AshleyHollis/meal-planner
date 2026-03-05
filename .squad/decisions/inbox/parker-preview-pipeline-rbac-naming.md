# Decision: Preview Pipeline RBAC & Resource Naming Gaps

**Date:** 2026-03-07  
**Author:** Parker (DevOps)  
**Status:** Pending action by Ashley

## Context

Preview pipeline run 22713841694 (PR #5) exposed three infrastructure misconfigurations. One was fixed in code; two require manual Azure CLI commands.

## Decisions / Findings

### 1. KEY_VAULT_NAME for preview DB must always be `kv-ytsumm-prd-ci`

`vars.KEY_VAULT_NAME` is set to `kv-ytsumm-prd` (legacy vault, auth0 secrets only). The `provision-preview-db` job must write SQL connection strings to `kv-ytsumm-prd-ci` (Terraform-managed, all runtime secrets). Fixed by hardcoding in `preview.yml` — do not rely on `vars.KEY_VAULT_NAME` for this job.

### 2. OIDC service principal lacks Contributor on `rg-ytsumm-prd`

The SP used for GitHub Actions (AZURE_CLIENT_ID) needs Contributor (or minimum: SQL DB Contributor) on `rg-ytsumm-prd` to provision preview databases. Azure returns `ResourceNotFound` (not 403) when RBAC is missing — this is an RBAC gap, not a missing resource.

**Action required:** Run the `az role assignment create` command in parker/history.md → Failure 1.

### 3. AKS kubelet identity lacks AcrPull on `acrytsummprdci`

CI pipeline pushes images to `acrytsummprdci.azurecr.io`. AKS was originally granted AcrPull on `acrytsummprd` (old ACR) only. Any PR deploy will fail with `401 Unauthorized` until AcrPull is granted on `acrytsummprdci`.

**Action required:** Run the `az role assignment create` command in parker/history.md → Failure 3.

### 4. `SWA_DEPLOYMENT_TOKEN` secret is stale / wrong SWA

The token in the GitHub secret references a non-existent SWA (likely `swa-mealplan-prd`). Actual SWA is `swa-ytsumm-prd` in `rg-ytsumm-prd-ci`.

**Action required:** Retrieve the correct token with `az staticwebapp secrets list` and update the GitHub secret.

## Resource Naming Reference (ytsumm → mealplan transition)

| Resource type | Old name (ytsumm) | New/correct name |
|---|---|---|
| Resource group (shared) | `rg-ytsumm-prd` | still `rg-ytsumm-prd` |
| Resource group (CI) | `rg-ytsumm-prd-ci` | still `rg-ytsumm-prd-ci` |
| Key Vault (legacy) | `kv-ytsumm-prd` | legacy, auth0 only |
| Key Vault (CI) | `kv-ytsumm-prd-ci` | use this for all CI secrets |
| ACR (old) | `acrytsummprd` | not used for CI images |
| ACR (CI) | `acrytsummprdci` | images pushed here |
| SQL Server | `sql-mealplan-prd` | in `rg-ytsumm-prd` |
| SWA | `swa-ytsumm-prd` | in `rg-ytsumm-prd-ci` |
| AKS | `aks-ytsumm-prd-ci` | in `rg-ytsumm-prd-ci` |
