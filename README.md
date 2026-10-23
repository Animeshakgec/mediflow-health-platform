# MediFlow — Hospital & Digital Health Platform

MediFlow is a portfolio and freelancing project for connecting patients, doctors, hospitals, laboratories, pharmacies, and administrative teams. It is designed as a secure, production-oriented healthcare platform that can grow in clear phases.

## Architecture overview

The initial system is a **modular monolith**: a versioned Express REST API, PostgreSQL database accessed through Sequelize, and separate React web clients. The backend owns validation, authentication, authorization, tenant isolation, and business workflows. Modules remain in one deployable backend; microservices are not part of the initial design. See [system architecture](docs/architecture/system-architecture.md).

## Technology stack

| Area | Technology |
| --- | --- |
| Backend | Node.js, Express.js, JavaScript ES Modules |
| Database | PostgreSQL, Sequelize, UUID primary keys |
| Validation and API docs | Zod, Swagger/OpenAPI |
| Identity and security | JWT access tokens, role-based and resource-level authorization, Helmet, CORS |
| Logging | Pino with redaction and security audit events |
| Frontend (later phase) | React, Vite, Tailwind CSS, React Router, Redux Toolkit |
| Backend verification | Mocha, Chai, Supertest |

Redis, cloud object storage, payment providers, and background queues are integration choices for later capabilities; they are not required to start the MVP.

## MVP scope

The first MVP delivers:

- User authentication and account lifecycle foundations.
- Hospital and branch management.
- Doctor and patient profiles, with scoped hospital staff memberships.
- Doctor availability and schedule exceptions.
- Appointment booking, cancellation, and rescheduling.
- Tenant isolation, request validation, audit events, and API documentation foundations.

The MVP does **not** include clinical encounters/EMR, prescriptions, queue operations, laboratory, pharmacy, inventory, billing/payments, medical-document uploads, AI, or frontend implementation in this phase. See the [product scope](docs/product/product-scope.md) and [development milestones](docs/architecture/system-architecture.md#development-milestones).

## Development phases

1. **Architecture and product scope** — complete; MVP, data boundaries, API, and security conventions are documented.
2. **Backend foundation** — current phase; Express app, configuration, persistence connection, response/error handling, logging, health check, OpenAPI, and quality tooling. Authentication/business modules are not included yet.
3. **Authentication and RBAC** — credentials, sessions, scoped roles, and authorization policies.
4. **Organizations and profiles** — hospitals, branches, memberships, doctors, and patients.
5. **Availability and appointments** — schedules, booking, cancellation, rescheduling, and concurrency protection.
6. **Frontend MVP** — patient and hospital experiences against the versioned API.
7. **Outpatient care and expansion** — queue/check-in, encounters, prescriptions, billing, laboratory, pharmacy/inventory, documents/consent, notifications, analytics, and future integrations as separately scoped releases.

## Project structure

```text
.
├── backend/                 # JavaScript ES Modules modular monolith foundation
├── patient-app/             # Planned React/Vite patient application; not implemented yet
├── hospital-app/            # Planned React/Vite staff dashboard; not implemented yet
├── docs/
│   ├── architecture/        # System, backend, frontend, ERD, API and security decisions
│   ├── development/         # Development process and delivery notes
│   ├── product/             # Scope and user journeys
│   ├── api/                 # API planning
│   ├── database/             # Database design
│   └── security/             # Security architecture
└── README.md
```

## Setup

See [backend setup instructions](backend/README.md). The initial backend foundation is in place; authentication, healthcare business logic, database migrations, and frontend code remain subsequent implementation phases.

## Architecture documents

- [System architecture](docs/architecture/system-architecture.md)
- [Backend architecture](docs/architecture/backend-architecture.md)
- [Frontend architecture](docs/architecture/frontend-architecture.md)
- [Initial database ERD](docs/architecture/database-erd.md)
- [Authentication and RBAC](docs/architecture/authentication-and-rbac.md)
- [API conventions](docs/architecture/api-conventions.md)
- [Error handling](docs/architecture/error-handling.md)
- [Logging strategy](docs/architecture/logging-strategy.md)
- [Multi-tenancy](docs/architecture/multi-tenancy.md)
- [Git workflow](docs/architecture/git-workflow.md)
