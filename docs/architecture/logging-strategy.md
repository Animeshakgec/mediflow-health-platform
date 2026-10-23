# Logging and Audit Logging Strategy

## Two distinct records

**Operational logs** explain service behavior and support reliability (requests, latency, errors, dependency health). **Audit events** record security-relevant access and business actions (actor, resource, scope, action and outcome). They have different access controls and retention needs; do not substitute ordinary request logs for an audit trail.

## Operational logging

Use Pino structured JSON logs with timestamp, severity, service/environment, request ID, route template, HTTP method/status, duration, and actor/tenant UUIDs when available. Log route templates, not sensitive path values. Include error code and sanitized error class for failures. Use request-scoped child logger context; avoid logging arbitrary headers, query strings, request/response bodies, passwords, tokens, patient names, dates of birth, diagnoses, clinical notes, prescriptions, or uploaded content.

Configure Pino redaction for `authorization`, `cookie`, `set-cookie`, password/secret/token fields, signed URL query parameters, payment credentials, and health data fields. Redact at the logger boundary and do not rely on each caller to remember. Production logs must use access-controlled centralized storage and a documented retention policy. Never use production patient data in development logs.

## Audit event convention

An append-only `audit_events` record should contain a UUID, timestamp, actor user ID (nullable for unauthenticated/system activity), tenant ID (nullable for platform-level events), action code, resource type and ID, outcome, request ID, source/channel, and reason/purpose when policy requires it. Store only the minimum metadata needed to establish what happened. Do not copy clinical payloads or credentials. Restrict read access; application APIs must not update/delete historical events. Use database privileges and operational controls to make tampering detectable; define retention under applicable policy before production.

Audit at minimum: login/recovery failures and successes; account disablement; membership/role grants and revocations; privileged configuration; sensitive patient lookup/read; appointment create/cancel/reschedule; and authorization denials where useful. Avoid duplicate events from middleware and services by assigning one event owner per action.

## Correlation and privacy

Generate a request ID at the edge; accept a caller-provided ID only if validated and preserve its untrusted provenance. Return it in response metadata and include it in operational and audit records. Do not put PHI in the ID or trace baggage. Tenant/actor IDs are identifiers, not permission proofs.

## Future asynchronous work

When background work is introduced, carry event/job ID, tenant ID, originating request ID, actor or system purpose, and attempt number. Workers revalidate authorization-sensitive scope and log provider response codes without payloads or secrets. Use an outbox if loss of a committed business event would be unacceptable; this is not required for the initial documentation-only phase.
