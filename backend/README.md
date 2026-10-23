# MediFlow Backend

The backend is the planned JavaScript ES Modules modular monolith for MediFlow. This Phase 1 foundation provides Express setup, validated configuration, PostgreSQL/Sequelize connectivity, request logging, standard responses and errors, request validation middleware, health checks, and OpenAPI/Swagger. It does not yet implement authentication or healthcare business modules.

## Technology stack

- Node.js 20.14 or newer
- Express 5, PostgreSQL, Sequelize 6
- Zod, dotenv
- Pino, pino-http, pino-pretty
- Helmet, CORS
- Swagger/OpenAPI
- Mocha, Chai, Supertest
- ESLint 9, Prettier 3

## Prerequisites

- Node.js and npm installed on Windows.
- PostgreSQL 14 or newer installed and running locally, or a reachable PostgreSQL database.

## Installation on Windows

Open PowerShell in the `backend` directory:

```powershell
Copy-Item .env.example .env
npm ci
```

Edit `.env` with a local PostgreSQL database name, username, and password. The example uses individual `DB_*` settings; you can instead set `DATABASE_URL` and clear the individual host/name/user values. Never put production credentials in this file or commit it.

Create a local development database if needed:

```powershell
createdb -U postgres mediflow_dev
```

If `createdb` is not on `PATH`, use the SQL Shell (psql) or pgAdmin and run:

```sql
CREATE DATABASE mediflow_dev;
```

There are no application tables yet. Future schema changes must use reviewed migrations; this backend never calls `sequelize.sync()`.

## Environment variables

| Variable          | Purpose                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`        | `development`, `test`, or `production`                                      |
| `PORT`            | HTTP port; defaults to `3000`                                               |
| `API_PREFIX`      | Versioned API path; defaults to `/api/v1`                                   |
| `DATABASE_URL`    | PostgreSQL connection URL, alternative to individual `DB_*` settings        |
| `DB_HOST`         | PostgreSQL host when not using `DATABASE_URL`                               |
| `DB_PORT`         | PostgreSQL port; defaults to `5432`                                         |
| `DB_NAME`         | Database name when not using `DATABASE_URL`                                 |
| `DB_USER`         | Database user when not using `DATABASE_URL`                                 |
| `DB_PASSWORD`     | Database password; may be blank for local setups that permit it             |
| `DB_LOGGING`      | Set `true` to emit SQL statements at debug level; leave off by default      |
| `CORS_ORIGIN`     | Comma-separated allowlist of browser origins                                |
| `LOG_LEVEL`       | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` |
| `JSON_BODY_LIMIT` | Express JSON size limit; defaults to `1mb`                                  |

Startup validates configuration and requires either `DATABASE_URL` or `DB_HOST`, `DB_NAME`, and `DB_USER`. Supplying both database configuration styles is an error.

## Development commands

```powershell
npm run dev
npm start
npm run lint
npm run format
npm run format:check
npm test
```

`npm run dev` uses Node's watch mode. `npm start` runs the production entry point. Stop the server with Ctrl+C; it stops accepting requests and closes the database pool cleanly.

## Health check and Swagger

- Health: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

The health endpoint calls `sequelize.authenticate()` and returns `503` if PostgreSQL is unavailable. It never returns connection details. The Supertest suite injects a database stub, so automated API tests do not require a running PostgreSQL instance.

## Project structure

```text
backend/
  src/
    config/                 # Environment, database, logger, OpenAPI setup
    common/
      errors/               # Application error type
      middleware/           # Request logging, validation, 404, global errors
      utils/                # Async wrapper and response envelopes
      validators/           # Shared schema primitives (feature schemas stay in modules)
    modules/
      health/               # Database-aware health endpoint only
    app.js                  # Importable Express application factory
    server.js               # Startup and graceful shutdown
  tests/                     # Supertest API and configuration tests
  migrations/                # Reserved for reviewed schema migrations
  seeders/                   # Reserved for synthetic/non-production seed data
```

## Security and implementation boundaries

The logger redacts common credential and health-data fields, and request logging records the URL path without query strings. CORS is an explicit origin allowlist, Helmet is enabled, and JSON bodies are size-limited. Authentication, RBAC, hospital CRUD, appointment workflows, migrations, Redis, jobs, and frontend applications are intentionally not implemented in this phase.
