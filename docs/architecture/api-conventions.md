# REST API Conventions

## Versioning and transport

Use `/api/v1` as the base path (for example `/api/v1/appointments`). Use HTTPS outside local development. JSON requests/responses use `application/json`; timestamps are ISO 8601 with timezone, represented as UTC instants. Schedule APIs also return the relevant IANA timezone for local presentation. Document the contract in Swagger/OpenAPI.

Version the URL for breaking contract changes. Additive optional fields may be introduced compatibly. Do not silently change a field's meaning or enum semantics in a released version; deprecate and plan a new version when compatibility cannot be preserved.

## Resource conventions

- Use plural, lowercase nouns (`/hospitals`, `/doctors`, `/appointments`); avoid verbs in the path.
- Use `GET` to read, `POST` to create/action subresources, `PUT` to replace, `PATCH` to partially update, and `DELETE` only for a domain operation that permits deletion/revocation.
- Use explicit transition subresources where needed, such as `POST /appointments/{id}/cancellations` and `POST /appointments/{id}/reschedules`, to capture reason, concurrency and audit behavior.
- Use `201 Created` and `Location` for created resources, `200 OK` for reads/updates with a body, `202 Accepted` for accepted asynchronous work, and `204 No Content` for successful operations without a body.
- Do not expose ORM names or internal table layout as a public API contract. Use explicit input/output schemas and avoid returning unnecessary personal data.

## Filtering, sorting, and pagination

Allow-list filters, sort fields, and sort direction. Reject unsupported filters and bound search length. Never interpolate client values into SQL identifiers. Initial pagination uses `page` and `pageSize`, default 25 and maximum 100. Return pagination metadata such as `hasNext`; include total only when its cost is acceptable. Use cursor pagination later for large timelines.

## Idempotency and concurrency

Require `Idempotency-Key` on appointment creation and other retry-sensitive writes. Scope storage by authenticated actor and tenant, bind a key to a request fingerprint, retain the outcome for a documented period, and return the original result on a matching replay. Reuse with a different payload returns `409 Conflict`. Concurrency-sensitive appointment writes must rely on PostgreSQL constraints/transactions, not only an availability read.

## Response envelopes

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Success",
  "meta": { "requestId": "opaque-id" }
}
```

For collections, `data` is an array and `meta` may include pagination fields. Omit optional `message` if it adds no useful information, consistently across the API.

Errors use the conventions in [error handling](error-handling.md): stable machine-readable code, safe message, optional field-level details, and request ID. Never return stack traces, SQL, secrets, or another tenant's resource data.

## Validation and security

Validate params, query, and body with Zod at the API boundary; reject unknown or sensitive fields where practical. Never trust client-supplied role, tenant, ownership, price, status, or authorization flags. Distinguish `401` and `403`. Use `404` to conceal cross-tenant existence when appropriate. Every route declares authentication, permission, tenant and resource policy in its OpenAPI/security documentation.

## Status code guide

| Status | Use |
| --- | --- |
| 400 | Malformed request or invalid encoding |
| 401 | Missing, invalid, or expired authentication |
| 403 | Authenticated actor lacks permission |
| 404 | Resource absent or intentionally concealed |
| 409 | State, idempotency, or slot conflict |
| 422 | Syntactically valid input violates domain rules |
| 429 | Rate limit exceeded |
| 500 | Unexpected internal failure |
| 503 | Temporary dependency outage |
