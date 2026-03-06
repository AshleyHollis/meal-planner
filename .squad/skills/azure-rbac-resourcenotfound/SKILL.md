# Skill: Azure RBAC ResourceNotFound Diagnosis & Fix

## Problem Pattern

When a GitHub Actions job fails with `ResourceNotFound` for an Azure resource that **actually exists**, the root cause is almost always missing RBAC, not a missing resource. Azure returns 404-equivalent errors when the caller lacks permission to see the resource.

## Diagnosis Checklist

1. Verify resource exists independently:
   ```bash
   az sql server list --query "[?name=='<server-name>']"
   az acr list --query "[?name=='<acr-name>']"
   ```
2. Check OIDC subject claim matches the federated credential on the SP:
   ```bash
   az ad app federated-credential list --id <APP_ID>
   ```
3. List current role assignments for the SP:
   ```bash
   az role assignment list --assignee <SP_OBJECT_ID> --all -o table
   ```

## Fix Template

```bash
# Get SP object ID from the client ID (value from AZURE_CLIENT_ID GitHub secret)
SP_OBJECT_ID=$(az ad sp show --id "$AZURE_CLIENT_ID" --query id -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Grant at resource group scope (broad but safe for preview infra)
az role assignment create \
  --role "Contributor" \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/<RG_NAME>"

# Or grant at specific resource scope (least-privilege)
RESOURCE_ID=$(az sql server show --name <SERVER> --resource-group <RG> --query id -o tsv)
az role assignment create \
  --role "SQL Server Contributor" \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$RESOURCE_ID"
```

## ACR Pull for AKS Kubelet

When AKS gets `401 Unauthorized` pulling from ACR:

```bash
AKS_KUBELET_ID=$(az aks show \
  --name <AKS_NAME> --resource-group <RG> \
  --query identityProfile.kubeletidentity.objectId -o tsv)

ACR_ID=$(az acr show --name <ACR_NAME> --resource-group <RG> --query id -o tsv)

az role assignment create \
  --role AcrPull \
  --assignee-object-id "$AKS_KUBELET_ID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$ACR_ID"
```

## Key Insight

Azure access control returns `ResourceNotFound` (not `Unauthorized`) when the calling identity cannot READ a resource. This is by design — it prevents enumeration attacks. Always check RBAC before concluding a resource is missing.

## Related Files (meal-planner project)

- `.github/workflows/preview.yml` — provision-preview-db job
- `.github/workflows/update-k8s-overlay.yml` — k8s pull test step
- `.squad/decisions/inbox/parker-preview-pipeline-rbac-naming.md`
