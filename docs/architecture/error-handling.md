# Error Handling and API Responses

## Error model

Represent expected application failures with a typed error carrying a stable `code`, safe client `message`, HTTP status, and optional allow-listed details. Examples include validation failure, unauthenticated, forbidden, not found, appointment conflict, and temporary dependency outage. Controllers do not build ad-hoc error envelopes; centralized Express error middleware maps known errors to the public contract.

Unknown errors become a generic `500 INTERNAL_ERROR`. Log the original exception with request ID and stack in protected operational logs, after redaction. Never send stack traces, SQL details, file paths, tokens, secrets, or patient data in the response.

## Error envelope

```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_SLOT_UNAVAILABLE",
    "message": "The selected appointment time is no longer available.",
    "details": [{ "field": "startsAt", "issue": "Choose another available time." }]
  },
  "meta": { "requestId": "opaque-id" }
}
```

`details` is optional, bounded, and safe to disclose. Validation details contain field and issue, not rejected raw values. Cross-tenant failures use the same response behavior as missing resources where existence is sensitive.

## Mapping and behavior

| Condition | HTTP | Public code example |
| --- | --- | --- |
| Malformed JSON/request | 400 | `REQUEST_MALFORMED` |
| Zod input validation | 422 | `VALIDATION_FAILED` |
| Missing/invalid credentials | 401 | `UNAUTHENTICATED` |
| Authenticated but disallowed | 403 | `FORBIDDEN` |
| Missing/concealed resource | 404 | `RESOURCE_NOT_FOUND` |
| Appointment no longer bookable or state conflict | 409 | `APPOINTMENT_CONFLICT` |
| Rate limit exceeded | 429 | `RATE_LIMITED` |
| Unexpected exception | 500 | `INTERNAL_ERROR` |
| Temporary external dependency outage | 503 | `DEPENDENCY_UNAVAILABLE` |

Do not expose internal ORM/database exceptions as public codes. Map unique/exclusion constraint errors to known domain conflicts only when the constraint is recognized; unknown persistence errors remain generic. Responses include request ID in `meta` and preferably an `X-Request-Id` header. Error messages are safe display text; clients localize if needed.

## Request lifecycle

Parse JSON safely, validate request ID format or generate a new opaque ID, validate inputs, authenticate, authorize, run the module use case, and pass all failures to the centralized handler. Ensure async route rejections are captured. On client disconnect, avoid unnecessary work where safe. Do not retry non-idempotent operations automatically without an idempotency key.

## Operational requirements

Record error code, status, route template, request ID, actor/tenant identifiers when known, and latency in logs. Redact authorization headers, cookies, credentials, health content, and request bodies by default. Alert on unexpected error rates and repeated authentication/authorization failures without placing PHI in alert text.
