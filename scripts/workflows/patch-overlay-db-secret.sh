#!/usr/bin/env bash
# =============================================================================
# Patch preview overlay to use per-PR database secret
# =============================================================================
# After the overlay is created on the preview-overlays branch, this script
# adds a JSON6902 patch to the kustomization.yaml that changes the
# ExternalSecret's remoteRef.key to the PR-specific Key Vault secret.
#
# Required environment variables:
#   PR_NUMBER - Pull request number
# =============================================================================
set -euo pipefail

if [[ -z "${PR_NUMBER:-}" ]]; then
  echo "❌ Required variable PR_NUMBER is not set"
  exit 1
fi

BRANCH="preview-overlays"
OVERLAY_DIR="k8s/overlays/preview-pr-${PR_NUMBER}"
KUSTOMIZATION="${OVERLAY_DIR}/kustomization.yaml"
SECRET_NAME="meal-planner-sql-connection-string-pr-${PR_NUMBER}"

echo "🔧 Patching overlay for PR #${PR_NUMBER} to use database secret ${SECRET_NAME}..."

# Configure git
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# Fetch and checkout the preview-overlays branch
if ! git fetch origin "${BRANCH}" 2>/dev/null; then
  echo "❌ Branch ${BRANCH} does not exist"
  exit 1
fi

git checkout "${BRANCH}"

# Verify the overlay exists
if [[ ! -f "${KUSTOMIZATION}" ]]; then
  echo "❌ Kustomization file ${KUSTOMIZATION} not found on ${BRANCH}"
  exit 1
fi

# Check if patch already exists (idempotent)
if grep -q "${SECRET_NAME}" "${KUSTOMIZATION}"; then
  echo "ℹ️  DB secret patch already present in kustomization, skipping"
  exit 0
fi

# Add the JSON6902 patch to change ExternalSecret remoteRef.key
# This appends to the existing patches array in the kustomization
cat >> "${KUSTOMIZATION}" <<EOF

  # Per-PR database isolation: point ExternalSecret to PR-specific Key Vault secret
  - target:
      kind: ExternalSecret
      name: db-credentials
    patch: |-
      - op: replace
        path: /spec/data/0/remoteRef/key
        value: ${SECRET_NAME}
EOF

echo "✅ Added DB secret patch to kustomization"

# Commit and push
git add "${KUSTOMIZATION}"
git commit -m "ci(preview): patch PR #${PR_NUMBER} overlay for per-PR database

Point db-credentials ExternalSecret to ${SECRET_NAME}
for database isolation between preview environments.

[skip ci]"

git push origin "${BRANCH}"

echo "✅ Overlay patched and pushed to ${BRANCH}"
