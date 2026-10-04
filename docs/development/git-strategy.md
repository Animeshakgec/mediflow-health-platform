# Git Strategy

## Branches

- `main` is always the reviewed, releasable line. Protect it with required CI and pull-request review when collaboration begins.
- A long-lived `development` branch is optional; for a solo developer, prefer short-lived feature branches merged to `main` to avoid a second source of truth. Add `development` only when a team needs an integration/staging cadence.
- Branch names: `feat/short-description`, `fix/short-description`, `docs/short-description`, `chore/short-description`.

## Commits and pull requests

Use Conventional Commit-style prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Keep commits focused and describe user-visible or architectural effects. Pull requests should state purpose, scope, risks, migration/security implications, and verification performed; link issues and include screenshots for UI changes. Never commit secrets, production data or generated medical documents.

## Issues and milestones

Issues should identify user outcome, acceptance criteria, module/tenant scope, validation/security considerations and dependencies. Use labels such as `phase-0`, `backend`, `patient-app`, `security`, `database`, `blocked`. Suggested milestones: `Phase 0 — Architecture`, `Phase 1 — Backend foundation`, `Phase 2 — Identity and tenancy`, `Phase 3 — Scheduling and appointments`, `Phase 4 — Outpatient care`, `Phase 5 — Billing and integrations`, followed by prioritized V1 modules.

For solo work, use issues and PRs as lightweight checkpoints, not ceremony. Prefer small reviewable vertical slices; migration changes should be explicit and reversible where possible.
