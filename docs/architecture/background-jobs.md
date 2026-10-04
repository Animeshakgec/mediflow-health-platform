# Background Jobs

## Appropriate asynchronous work

| Work | Trigger / queue behavior | Notes |
|---|---|---|
| Appointment reminders | Schedule from confirmed appointment; cancel/reschedule when appointment changes | Idempotent by appointment, reminder type and scheduled time; suppress if cancelled. |
| Email/SMS/push notifications | Outbox event after committed state change | Retry with backoff; provider idempotency where available; avoid sensitive content. |
| PDF generation | User/system request | Store result privately; authorize retrieval; job may expire. |
| Medical document processing | Upload confirmed | Future: antivirus, metadata extraction/OCR; quarantine until scan result. |
| Report generation | Staff request or scheduled period | Tenant-scoped snapshot; protect exports, expire objects and audit download. |
| Analytics aggregation | Periodic, derived data | Keep out of transactional path; minimize/de-identify data where possible. |

## Recommendation

Use a Redis-backed Node job queue (for example, evaluate BullMQ at implementation time) for delayed/retried work. Redis is not the system of record. PostgreSQL remains authoritative for appointments, payment status, notification state and job intent. Use an outbox table for critical events so a committed appointment change cannot be lost if Redis is unavailable between commit and enqueue. A worker publishes outbox events and processes idempotent jobs; record attempts, terminal failures and provider references in PostgreSQL.

Jobs carry tenant ID, actor or system purpose, resource ID, correlation ID and an idempotency key. Workers re-load and re-check current resource state and tenant before acting. Never serialize full clinical records into Redis payloads. Use bounded retries, exponential backoff, dead-letter handling/alerts and safe replay. Set queue access credentials and network policy; do not expose Redis publicly.

Do not add a queue dependency until an asynchronous workflow is implemented. Phase 0 records the architectural boundary only.
