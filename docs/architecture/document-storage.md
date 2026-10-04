# Medical Document Storage

## Flow

The browser asks the API to start an upload. The API authenticates the actor, checks patient/tenant/consent scope, validates declared metadata, creates a pending document-version row, and returns a short-lived presigned S3 URL for one opaque object key. The browser uploads directly to the private bucket. The client confirms completion; the API verifies object key, size and metadata before marking the version available (or quarantined). Downloads repeat authorization and return a short-lived presigned GET URL. The flow is diagrammed in [system architecture](system-architecture.md).

## Storage decisions

- Store bytes in private S3, not PostgreSQL: large objects increase database size, backup/restore cost and query/storage contention. PostgreSQL stores metadata and lifecycle state.
- Use opaque random object keys such as `tenant/{tenantUuid}/documents/{documentUuid}/versions/{versionUuid}`. No patient name, diagnosis or human-readable PHI in the key. Keep IDs opaque and access-controlled; object naming is not authorization.
- Enable block-public-access, server-side encryption, least-privilege IAM and lifecycle/retention rules reviewed against legal requirements. Never make the bucket public.
- Metadata includes tenant/patient relationship, category, safe display name, MIME type, byte size, checksum, uploader, status, timestamps, object key and version. Avoid duplicate sensitive details.
- Presigned URLs should be short-lived (for example, 5 minutes), bound to a single object and method, and not logged or persisted. Tune lifetime to usability and deployment constraints.

## Validation and versioning

Initial proposed upload limit: **20 MiB per file**, subject to product and hosting review. Allow only an explicit list such as PDF, JPEG and PNG for MVP; reject executable/script formats and validate magic bytes as well as declared MIME type. Set request limits and prevent path/key injection. For downloads use safe content disposition and `X-Content-Type-Options: nosniff`.

Each replacement creates a new immutable `document_versions` row; never overwrite an object version in place. Keep document-level status and per-version scan/availability status. Malware scanning and quarantine are future enhancements, but production uploads should be gated by a defined risk decision and scanner before opening broad upload access.

## Access, sharing and audit

Authorize every upload, metadata read, preview and download independently. Patient-to-hospital sharing uses consent/grant scope, purpose and expiry; revocation prevents new URL issuance. A previously issued URL remains usable until it expires, so keep expiry short. Record actor, tenant, document/version, operation, purpose, outcome and request ID in access logs; do not log URL signatures or file contents.
