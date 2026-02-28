#!/bin/bash
# =============================================================================
# CI: Check if Main Branch
# =============================================================================
# Determines if the current event is from the master branch
#
# INPUT ENVIRONMENT VARIABLES (from GitHub Actions):
#   - GITHUB_REF: Full reference name (e.g., refs/heads/master)
#   - GITHUB_REF_NAME: Short reference name (e.g., master)
#   - GITHUB_EVENT_NAME: Event type (push, pull_request, etc)
#
# OUTPUT: Sets GITHUB_OUTPUT with:
#   - is_main_branch: true if master branch, false otherwise
#
# USAGE:
#   GITHUB_REF="refs/heads/master" GITHUB_REF_NAME="master" GITHUB_EVENT_NAME="push" scripts/workflows/ci-check-branch.sh
# =============================================================================

set -e

force_full="${FORCE_FULL:-false}"
echo "force_full=$force_full" >> "$GITHUB_OUTPUT"

# Check if this is a push to master branch or PR targeting master
if [[ "${GITHUB_REF}" == "refs/heads/master" ]] || [[ "${GITHUB_EVENT_NAME}" == "push" && "${GITHUB_REF_NAME}" == "master" ]]; then
    echo "is_main_branch=true" >> "$GITHUB_OUTPUT"
    echo "✓ Master branch detected - FULL validation mode"
else
    echo "is_main_branch=false" >> "$GITHUB_OUTPUT"
    echo "✓ PR/branch detected - Smart change detection mode"
fi

if [[ "$force_full" == "true" ]]; then
    echo "✓ Forced full validation mode"
fi
