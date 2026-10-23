# Git Workflow

## Branches

- `main` is the reviewed, releasable branch. Protect it with pull request review and CI checks when collaboration begins.
- For solo work, use short-lived feature branches and merge to `main`; a long-lived `development` branch is optional only when a team needs an integration cadence.
- Branch names use a lowercase type and short kebab-case description: `feat/appointment-booking`, `fix/slot-conflict`, `docs/api-conventions`, `chore/backend-config`.

## Commits

Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, and `chore:`. Keep each commit focused and describe the outcome, not just the files touched. Add a scope when useful, such as `feat(appointments): prevent overlapping bookings`.

Never commit secrets, production patient information, real medical documents, local `.env` files, or generated artifacts that are not intentionally versioned. Keep seed data synthetic.

## Pull requests

Keep changes reviewable. A PR describes the user or architecture outcome, scope, relevant issue, migration/security/tenant-isolation implications, and verification performed. Include screenshots for UI changes and document any deferred decision. Database migrations should be reviewed, forward-only by default, and have a safe rollout/rollback note where possible.

## Delivery checkpoints

Suggested milestones: `Phase 0 — Architecture`, `Phase 1 — Backend foundation and identity`, `Phase 2 — Organizations and profiles`, `Phase 3 — Availability and appointments`, `Phase 4 — MVP clients`, followed by separately scoped outpatient-care and expansion releases. Issues should state acceptance criteria, module and tenant scope, authorization/security considerations, dependencies, and verification expectations.
