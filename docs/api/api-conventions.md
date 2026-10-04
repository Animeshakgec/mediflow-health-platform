# API Conventions

## Base and transport

- Base path: `/api/v1`; HTTPS only outside local development.
- JSON request/response bodies use `application/json`; dates are ISO 8601 with timezone. Use UTC instants and include a named timezone when presenting schedules.
- REST resources use plural lowercase nouns (`/appointments`); nested paths express containment only when it improves clarity. Avoid verbs in paths; use subresources or explicit action endpoints for state transitions.
- Never expose internal database field names as an implicit public contract. Document endpoints with OpenAPI before implementation.

## Methods and status codes

- `GET` reads; `POST` creates or starts a non-idempotent operation; `PUT` replaces a resource; `PATCH` changes selected fields; `DELETE` removes/revokes where the domain permits.
- Use `201 Created` plus `Location` for creation, `200 OK` for successful read/update, `202 Accepted` for queued work, `204 No Content` when no body is needed.
- Use `400` malformed request, `401` unauthenticated, `403` authenticated but forbidden, `404` absent or intentionally concealed resource, `409` state/idempotency/slot conflict, `422` valid syntax with invalid domain input, `429` rate-limited, `500` unexpected failure, and `503` temporary dependency outage.

## Naming, query and pagination

- Query filters are allow-listed: e.g. `status`, `branchId`, `from`, `to`; reject unsupported fields.
- Pagination uses `page` and `pageSize` initially (bounded, default 25, maximum 100); use opaque cursor pagination for high-volume timelines later. Return `page`, `pageSize`, `total` only when count cost is acceptable, and `hasNext`.
- Sorting uses `sort=startsAt` and `direction=asc|desc` from an allow-list. Search uses `q` with bounded length and documented matching behavior. Never interpolate query values into SQL identifiers.
- Use `Idempotency-Key` on appointment booking, payment/refund initiation and other retry-sensitive creates. Scope keys to actor and tenant and retain result mapping for a documented period.

## Success envelope

```json
{
  "success": true,
  "data": {},
  "message": "Success",
  "meta": { "requestId": "opaque-id" }
}
```

Collection `data` can be an array; pagination lives in `meta`. Do not include unnecessary personal/clinical fields.

## Error envelope

```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_SLOT_UNAVAILABLE",
    "message": "The selected appointment slot is no longer available.",
    "details": [{ "field": "slotId", "issue": "Choose another available slot." }]
  },
  "meta": { "requestId": "opaque-id" }
}
```

`details` is optional and must not contain secrets or another tenant's data. Error codes are stable machine-readable identifiers; messages are safe for display but localization is a client concern.

## Validation and security behavior

- Validate all params, query and body at the API boundary with Zod; reject unknown sensitive fields where practical.
- Never trust client-supplied role, tenant, price, status transition, ownership, or authorization flags.
- Keep `401` distinct from `403`; return `404` for cross-tenant resources when existence disclosure is a concern.
- Include request IDs in responses/log context. Do not return stack traces, SQL, tokens, or provider secrets.
- Use consistent conflict responses for optimistic/concurrent updates and appointment slot contention.
