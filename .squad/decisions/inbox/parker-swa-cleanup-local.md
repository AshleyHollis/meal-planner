# Decision: Local Closed-PR-Aware SWA Cleanup Action

**Author:** Parker (DevOps)
**Date:** 2026-03-03
**Status:** Implemented

## Context

The shared-infra SWA cleanup action (`AshleyHollis/shared-infra/.github/actions/cleanup-stale-swa-environments@v1`) used age-based deletion — any SWA environment older than N hours got deleted. This caused cross-branch preview deletion: deploying from branch A would delete branch B's preview environment if it was old enough.

Increasing `min-age-hours` to 24 (previous fix) was a band-aid. The fundamental issue is that age-based cleanup doesn't account for whether a PR is still active.

## Decision

Replaced the shared-infra reference with a local composite action (`.github/actions/cleanup-stale-swa-environments/`) that checks PR open/closed status before deleting. Only environments for closed/merged PRs get cleaned up.

## Consequences

- ✅ Eliminates cross-branch preview deletion race condition
- ✅ Open PRs' preview environments are always preserved
- ✅ Production "default" environment is always protected
- ✅ Same input interface — minimal workflow change (one line)
- ⚠️ This repo now owns its cleanup logic (not shared-infra). Changes must be made locally.
- ⚠️ Requires `gh` CLI and Azure CLI on runner (both available on `ubuntu-latest`)
