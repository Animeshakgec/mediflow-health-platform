# Security Architecture

Security controls must be implemented and validated before real patient data is used. This blueprint does not establish regulatory compliance by itself; obligations depend on launch jurisdictions, contracts and implemented operations.

## Identity and access

- Hash passwords with Argon2id or a well-maintained bcrypt configuration; unique salts are automatic. Never encrypt passwords reversibly or log credentials.
- Use short-lived signed JWT access tokens with minimal claims (`sub`, token/session ID, expiry, issuer/audience). Keep permissions and tenant membership authoritative server-side or version claims so revocation can take effect.
- Store refresh tokens hashed, rotate on every use, detect reuse, revoke the token family on suspicious reuse/logout/password reset. Protect browser storage according to client threat model; secure, HttpOnly, SameSite cookies are preferred for refresh credentials where deployment permits.
- Enforce RBAC plus tenant, resource, relationship and purpose checks on every backend operation. Do not trust frontend authorization or client-selected tenant IDs.
- Apply least privilege to staff roles and database/service credentials. Support exceptional access with reason, expiry, audit and review.

## API and browser controls

- Apply Helmet with reviewed headers; configure CORS for explicit frontend origins, methods and headers. CORS is not authorization.
- Rate-limit login, recovery, booking, token refresh and sensitive lookup endpoints; use Redis-backed limits only as a distributed control, not as the sole security boundary.
- Validate params/query/body with Zod; allow-list filters and transitions; use Sequelize parameterization. Protect against mass assignment by explicit input schemas.
- Use TLS, secure cookie settings where applicable, CSRF controls for cookie-authenticated mutations, content security policy and dependency updates.

## Medical files

- Keep S3 buckets private with public access blocks, encryption at rest and least-privilege IAM. Store opaque keys, not patient names/IDs, in paths. Do not proxy unrestricted bucket URLs.
- Backend authorizes each upload/download and issues short-lived, object-specific presigned URLs. Validate size, allowed content types and file signature where possible; store checksum and metadata. Malware scanning/quarantine is a future production hardening requirement before broad user uploads.
- Log document access without logging file contents or signed URL query strings. See [document storage](../architecture/document-storage.md).

## Sensitive data and logging

Extra protection is required for diagnoses, notes, prescriptions, lab results, allergies, vitals, reproductive/behavioral health data, patient identifiers, dependent/guardian relationships, consent, payment references and uploaded documents. Limit collection and access by purpose; encrypt in transit and at rest; consider field-level encryption only after key management and query needs are defined. Mask data in support tools and non-production environments.

Pino logs should use redaction for authorization/cookie headers, passwords, tokens, signed URLs, payment secrets and sensitive health fields. Prefer actor ID, tenant ID, request ID, action and outcome over full request/response payloads. Audit logs are append-only at the application interface, access restricted, tamper-evident where feasible, and retained under a defined policy.

## Database, backup and operations

- PostgreSQL is private-network-only; use unique least-privilege credentials, TLS where supported, encrypted storage, managed secrets and separate production/nonproduction environments.
- Use migrations with review, backups, point-in-time recovery where the provider supports it, and documented restore exercises. Define RPO/RTO before production; an untested backup is not a recovery plan.
- Encrypt and restrict backups; define retention/deletion and incident response. Avoid production patient data in development, test fixtures or analytics exports.
- Monitor authentication anomalies, privilege changes, cross-tenant denials, bulk exports and repeated access failures. Protect alert content from leaking PHI.

## Regulatory boundary

Do not claim HIPAA, GDPR, ABDM or other compliance based solely on this list. Determine applicable law, hosting/data residency, business associate/processor terms, consent rules, breach reporting, retention and audit requirements before production use.
