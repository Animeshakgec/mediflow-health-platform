# Repository Structure

## Recommendation: monorepo

Start with one repository containing backend and the two web clients. A solo developer benefits from one issue/PR workflow, shared API contract documentation, coordinated changes and one CI setup. Keep deployables and package boundaries clear so a client or service can later move if independent ownership/release cadence becomes necessary. Do not introduce a workspace/build-tool dependency until shared packages or coordinated builds justify it.

## Proposed structure

```text
mediflow-health-platform/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment parsing, DB and provider configuration
│   │   ├── common/             # Errors, middleware, validation, logging, shared primitives
│   │   ├── modules/            # Business modules; each owns routes/service/repository/model
│   │   ├── jobs/               # Worker entrypoints and job handlers
│   │   ├── integrations/       # Payment, email/SMS, S3 and future provider adapters
│   │   ├── app.js              # Express app composition (no listen side effect)
│   │   └── server.js           # Runtime bootstrap and graceful shutdown
│   ├── tests/                  # Unit/integration/API tests (added in implementation phases)
│   ├── migrations/             # Reviewed Sequelize migrations
│   └── seeders/                # Non-production bootstrap/reference data
├── patient-app/                # React/Vite patient experience
├── hospital-app/               # React/Vite hospital dashboard
├── docs/                       # Architecture, product, API, security and development docs
├── .github/workflows/          # CI and release workflows
├── .editorconfig
├── .gitignore
├── package.json                # Optional root scripts only when useful
└── README.md
```

Each backend module should expose a small public service surface. Routes validate input and call services; services own use cases/transactions; repositories/models own persistence. Do not let module code write another module's tables directly. Keep `app.js` importable for Supertest; `server.js` owns listening. Place module-specific tests near a module or in `backend/tests` consistently after team choice.

The requested architecture is backend-first; the proposed frontend directories do not authorize starting frontend implementation in Phase 0. No Docker files are proposed: managed services and environment configuration are sufficient until local parity or deployment orchestration establishes a specific need.
