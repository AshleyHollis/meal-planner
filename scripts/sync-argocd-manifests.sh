#!/usr/bin/env bash
# =============================================================================
# Sync Argo CD Manifests to AKS Cluster
# =============================================================================
# Applies ArgoCD ApplicationSet and related manifests to the cluster.
# Gracefully exits if AKS/kubectl is not available (no cluster provisioned).
#
# Usage:
#   ./scripts/sync-argocd-manifests.sh [--infra-only|--apps-only] [OPTIONS]
#
# Options:
#   --infra-only      Only sync infrastructure manifests
#   --apps-only       Only sync application manifests
#   --namespace NS    ArgoCD namespace (default: argocd)
#   --dry-run         Show what would be applied without applying
#   --verbose         Enable verbose output
#   --skip-validation Skip manifest validation
# =============================================================================

set -euo pipefail

NAMESPACE="argocd"
DRY_RUN=false
VERBOSE=false
SKIP_VALIDATION=false
MODE="all"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --infra-only)  MODE="infra"; shift ;;
    --apps-only)   MODE="apps"; shift ;;
    --namespace)   NAMESPACE="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --verbose)     VERBOSE=true; shift ;;
    --skip-validation) SKIP_VALIDATION=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARGOCD_DIR="$REPO_ROOT/k8s/argocd"

# Check if kubectl is available and connected to a cluster
if ! command -v kubectl &>/dev/null; then
  echo "[INFO] kubectl not found - skipping ArgoCD sync (no cluster available)"
  exit 0
fi

if ! kubectl cluster-info &>/dev/null; then
  echo "[INFO] No Kubernetes cluster connection - skipping ArgoCD sync"
  echo "[INFO] This is expected if AKS has not been provisioned yet"
  exit 0
fi

# Check if ArgoCD namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
  echo "[INFO] ArgoCD namespace '$NAMESPACE' does not exist - skipping sync"
  echo "[INFO] Deploy ArgoCD to the cluster first"
  exit 0
fi

# Check if ArgoCD manifests directory exists
if [[ ! -d "$ARGOCD_DIR" ]]; then
  echo "[INFO] No ArgoCD manifests found at $ARGOCD_DIR - skipping sync"
  exit 0
fi

echo "[INFO] Syncing ArgoCD manifests (mode: $MODE, namespace: $NAMESPACE)"

# Apply manifests
DRY_RUN_FLAG=""
if [[ "$DRY_RUN" == "true" ]]; then
  DRY_RUN_FLAG="--dry-run=client"
  echo "[INFO] Dry-run mode enabled"
fi

apply_manifests() {
  local dir="$1"
  local label="$2"

  if [[ ! -d "$dir" ]]; then
    echo "[INFO] No manifests at $dir - skipping $label"
    return 0
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    echo "[INFO] Applying $label from $dir"
  fi

  kubectl apply -f "$dir" -n "$NAMESPACE" $DRY_RUN_FLAG
  echo "[INFO] ✓ $label applied"
}

case "$MODE" in
  all)
    apply_manifests "$ARGOCD_DIR" "ArgoCD manifests"
    ;;
  infra)
    apply_manifests "$ARGOCD_DIR/infra" "Infrastructure manifests"
    ;;
  apps)
    apply_manifests "$ARGOCD_DIR/apps" "Application manifests"
    ;;
esac

echo "[INFO] ArgoCD sync complete"
