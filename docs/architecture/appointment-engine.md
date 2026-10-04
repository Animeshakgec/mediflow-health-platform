# Appointment Engine

Appointment booking is a correctness-critical transaction. PostgreSQL is authoritative; a Redis lock or cached availability result is never the final protection against double booking.

## Availability model

Recurring `doctor_schedules` define local working windows, slot duration/capacity and effective dates. Each schedule is bound to a doctor, tenant, branch and IANA timezone. `schedule_exceptions` represent leave, holidays, blocked periods or explicitly added hours and take precedence. Generate candidate slots for a bounded date range, convert local times carefully across daylight-saving transitions, then subtract exceptions and reserving appointments/holds. Return an availability snapshot, not a promise: the slot can be claimed by someone else before booking commits.

## Booking and concurrency

1. Validate patient/dependent authority, tenant/branch, doctor, slot window, schedule and booking policy.
2. Require an idempotency key and create/lookup its scoped operation record.
3. Begin a PostgreSQL transaction. Lock the relevant schedule/slot allocation row, or insert into a slot-reservation table with a unique `(tenant_id, doctor_id, slot_start)` constraint for fixed slots.
4. Recheck schedule exceptions and current active reservations inside the transaction.
5. Insert appointment in a reserving state plus status-history row. Enforce a database-level exclusion constraint against overlapping active doctor appointments (PostgreSQL range + GiST where supported), or unique fixed-slot reservation constraint. Application checks alone are insufficient.
6. Commit. On constraint violation, return `409 APPOINTMENT_SLOT_UNAVAILABLE`; on retry with same idempotency key, return the original outcome.
7. Publish confirmation/reminder through an outbox after commit; do not call an unreliable notification provider while holding DB locks.

Two near-simultaneous requests may both see a slot as free. The database lock/constraint serializes the claims: one transaction commits; the other waits or fails the uniqueness/exclusion check and receives a conflict. Redis can reduce contention or coordinate expiring holds but cannot replace this database guard.

## Slot holds and payment dependency

If payment before confirmation is required, create a short-lived hold/reservation with an expiry and idempotency key, then initiate the payment provider flow. Do not hold a database transaction open during payment. A worker expires unpaid holds safely. Verified provider callbacks or reconciliation transition payment and appointment states idempotently. Decide whether booking is `pending_payment`, `confirmed`, or `payment_pending_confirmation` based on the selected hospital policy. A successful payment callback after hold expiry needs a documented compensation/refund path; never silently double-book.

## Status and transitions

Suggested appointment states: `pending_payment` (optional), `booked`, `confirmed`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show`, `rescheduled`, `expired`. Define allowed transitions centrally and append each transition with actor, reason and timestamp. Distinguish payment status from appointment status. Rescheduling should atomically claim the new slot and release/cancel the old appointment with history; do not mutate start time without a trace. Cancellation rules include cutoff, actor and possible refund policy. No-show is staff/system-recorded with policy safeguards.

## Transactions and failure handling

Use Sequelize managed transactions and database constraints. Keep transactions short; never include provider network calls. Retry only known serialization/deadlock failures with bounded retries and same idempotency key. Treat timeouts as unknown outcomes and resolve by idempotency lookup. Emit outbox events in the same transaction for notifications/payment follow-up. Record all changes in status history and audit log.

## Decisions still needed

Fixed-duration slots vs variable capacity; hold duration; payment required by hospital/service; cancellation/refund windows; overbooking policy; doctor overlap across branches; timezone/DST presentation; and which PostgreSQL constraint strategy Sequelize migrations will create. Decide before Phase 1 booking implementation.
