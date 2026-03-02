# Parker — History

## Project Context

- **Project:** Meal Planner MVP — AI meal planner with inventory, weekly plans, grocery lists
- **Stack:** Next.js 16 + FastAPI + SQLAlchemy + Azure (AKS, SQL, SWA) + Auth0
- **Owner:** Ashley Hollis
- **Branch:** 001-meal-planner-mvp (PR #1)
- **State:** Phases 1-4 complete. CI pipeline exists. PR #1 open.
- **Key files:** .github/workflows/, k8s/, infra/terraform/, Dockerfile(s)
- **Architecture:** GitHub Actions → CI → Preview Deploy (Terraform + ArgoCD + SWA) → E2E tests
- **Last pipeline run:** 22566812328

## Learnings

### CI Pipeline & E2E Test Architecture (2026-03-02)

**Run 22566812309 Job Status:**

- ✅ Python Lint (ruff) — PASSED
- ✅ Frontend Quality (ESLint, tsc, build) — PASSED
- ✅ Security Scan (bandit, pip-audit, gitleaks) — PASSED
- ✅ Test API — PASSED
- ✅ Test Workers — PASSED
- ✅ Kubernetes Validation (kustomize) — PASSED
- ✅ Terraform Validation — PASSED
- ✅ Prepare Image Tag (docker-build-meta) — PASSED
- ✅ Build API & Worker Images — PASSED
- ⏭️ Deploy to Static Web Apps — **SKIPPED** (correct: PR event, not push to master)
- ✅ CI Status Gate — PASSED

**Pipeline Design:**

- CI workflow (.github/workflows/ci.yml) runs on PR + push to master. Does NOT run E2E tests directly.
- E2E tests live in separate workflows:
  - preview-e2e.yml: Manual trigger or workflow_call
  - preview.yml (Phase 9): Runs E2E after successful backend + frontend deployment to preview
- E2E tests require:
  1. Preview deployment success (Argo CD sync + health checks)
  2. Frontend deployment success (SWA)
  3. Auth0 test credentials from Azure Key Vault
  4. Deployment preview URLs (API + frontend)

**E2E Gating in Preview Workflow:**

- E2E only runs if:
  - All deployment jobs (verify-deployment, deploy-frontend) succeeded
  - Concurrency gate allows deployment
  - Preview URL is not empty
  - Always triggered for PR events (but respects success conditions)

**SWA Deploy Skip:**

- SWA deploy in CI is correctly skipped for PR events (requires `push` to `master`)
- This is NOT blocking E2E — E2E runs against preview environment, not SWA directly
- SWA is production deployment path only

**Key Infrastructure:**

- Argo CD auto-syncs k8s/overlays/preview/ for preview namespaces
- Preview URLs follow pattern: pr-{number}.meal-planner.apps.ashleyhollis.com
- TLS certificates verified before health checks
- Database migrations checked as part of deployment diagnostics
