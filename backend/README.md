# MediFlow Backend

The backend is a JavaScript ES Modules modular monolith for MediFlow. Phase 1 provides Express setup, validated configuration, PostgreSQL/Sequelize connectivity, request logging, standard responses and errors, request validation middleware, health checks, and OpenAPI/Swagger. Phase 2 adds patient registration/login, JWT access tokens, rotating refresh sessions, password changes, and reusable RBAC/tenant middleware. Hospital CRUD and healthcare business modules remain out of scope.

## Technology stack

- Node.js 20.14 or newer
- Express 5, PostgreSQL, Sequelize 6
- Zod, dotenv, bcryptjs
- jose (JWT), cookie-parser, express-rate-limit
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

The identity migration creates users, auth sessions, roles, permissions, role assignments, memberships, and a minimal hospitals tenant-root table. It does not create hospital-management endpoints. Apply reviewed migrations with `npm run db:migrate`; undo the latest migration with `npm run db:migrate:undo`. The backend never calls `sequelize.sync()`.

## Environment variables

| Variable                                            | Purpose                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`                                          | `development`, `test`, or `production`                                                    |
| `PORT`                                              | HTTP port; defaults to `3000`                                                             |
| `API_PREFIX`                                        | Versioned API path; defaults to `/api/v1`                                                 |
| `DATABASE_URL`                                      | PostgreSQL connection URL, alternative to individual `DB_*` settings                      |
| `DB_HOST`                                           | PostgreSQL host when not using `DATABASE_URL`                                             |
| `DB_PORT`                                           | PostgreSQL port; defaults to `5432`                                                       |
| `DB_NAME`                                           | Database name when not using `DATABASE_URL`                                               |
| `DB_USER`                                           | Database user when not using `DATABASE_URL`                                               |
| `DB_PASSWORD`                                       | Database password; may be blank for local setups that permit it                           |
| `DB_LOGGING`                                        | Set `true` to emit SQL statements at debug level; leave off by default                    |
| `CORS_ORIGIN`                                       | Comma-separated allowlist of browser origins                                              |
| `LOG_LEVEL`                                         | Pino level: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent`               |
| `JSON_BODY_LIMIT`                                   | Express JSON size limit; defaults to `1mb`                                                |
| `JWT_ACCESS_SECRET`                                 | HS256 signing secret; at least 32 characters, replace the local placeholder in production |
| `JWT_ISSUER` / `JWT_AUDIENCE`                       | Required access-token claims and validation values                                        |
| `JWT_ACCESS_TTL_SECONDS`                            | Access-token lifetime; defaults to 15 minutes                                             |
| `AUTH_REFRESH_TTL_SECONDS`                          | Refresh-family absolute lifetime; defaults to 30 days                                     |
| `AUTH_COOKIE_NAME`                                  | Refresh cookie name; defaults to `mediflow_refresh`                                       |
| `AUTH_COOKIE_SAME_SITE`                             | `lax` or `strict`; defaults to `lax`                                                      |
| `AUTH_COOKIE_SECURE`                                | Set `true` behind HTTPS; required in production                                           |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | Process-local auth request limits; defaults to 15 minutes / 10 requests                   |

Startup validates configuration and requires either `DATABASE_URL` or `DB_HOST`, `DB_NAME`, and `DB_USER`. Supplying both database configuration styles is an error.

## Development commands

```powershell
npm run dev
npm start
npm run lint
npm run format
npm run format:check
npm test
npm run db:migrate
npm run db:migrate:undo
```

`npm run dev` uses Node's watch mode. `npm start` runs the production entry point. Stop the server with Ctrl+C; it stops accepting requests and closes the database pool cleanly.

## Health check and Swagger

- Health: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

The health endpoint calls `sequelize.authenticate()` and returns `503` if PostgreSQL is unavailable. It never returns connection details. The Supertest suite injects a database stub, so automated API tests do not require a running PostgreSQL instance.

## Authentication API

All routes are under `/api/v1/auth` and documented in Swagger:

- `POST /register` creates a `PATIENT` account only.
- `POST /login` verifies credentials and returns a short-lived access token; the refresh credential is set as an HttpOnly cookie.
- `POST /refresh` rotates the refresh credential and revokes the old token. Reuse revokes the full token family.
- `POST /logout` revokes the presented refresh-token family and clears the cookie.
- `GET /me` returns the authenticated user and assigned roles/memberships.
- `PATCH /change-password` verifies the current password and revokes all sessions.

Example registration body (use a non-real address and password in local testing):

```json
{
  "name": "Example Patient",
  "email": "patient@example.test",
  "password": "replace-with-a-long-local-password"
}
```

The refresh token is never returned in JSON or stored in plaintext. Send the access token as `Authorization: Bearer <access-token>`. Browser requests that use the refresh cookie must include credentials; CORS origins come from `CORS_ORIGIN`. Access tokens are intended to remain in client memory. Email verification, password recovery, MFA, account lockout, hospital onboarding, and role assignment endpoints are not implemented.

Protect a route with `authenticate(authService)`. Add `requireRoles(authService, 'HOSPITAL_ADMIN')` or `requirePermission(authService, 'hospital.read')` after `authenticate`. For hospital-scoped routes, apply `requireTenantMembership(sequelize)` and pass the verified `req.tenantId` into the module service. Never authorize using a tenant ID or role copied from the request body.

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
      models/                # Sequelize model and association registration
      modules/
        auth/                # Authentication routes, schema, controller, service
        health/              # Database-aware health endpoint
      config/runMigrations.js # Migration runner
    app.js                  # Importable Express application factory
    server.js               # Startup and graceful shutdown
  tests/                     # Supertest API and configuration tests
  migrations/                # Reserved for reviewed schema migrations
  seeders/                   # Reserved for synthetic/non-production seed data
```

## Security and implementation boundaries

The logger redacts credentials and health-data fields, and request logging records URL paths without query strings. CORS is an explicit origin allowlist, Helmet is enabled, and JSON bodies are size-limited. The auth rate limiter is process-local; multi-instance production deployments need a shared rate-limit store. RBAC middleware and membership checks are reusable foundations, but no hospital CRUD, patient records, doctor scheduling, or appointment endpoints exist yet. Test database configuration must use an isolated database; never point tests at development or production data.
