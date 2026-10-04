# Patient Journey (MVP)

The path below describes the intended outpatient MVP. Payment may be optional or collected at booking depending on hospital policy; that product decision remains open.

| Step | Actor | API/module | Data created or updated | Validation | Failure cases |
|---|---|---|---|---|---|
| Registration | Patient | `/auth`, users, patients | User credential/account; patient profile; verification state | Normalize unique login; strong password; verify contact; minimum necessary demographics | Duplicate identity, invalid contact, verification expiry, provider unavailable |
| Login | Patient | `/auth` | Session/refresh-token family; access token | Credential status; rate limit; MFA policy if later enabled | Invalid credentials, locked/suspended account, expired/revoked refresh token |
| Search doctor | Patient | doctors, hospitals, branches | No persistent change; search parameters | Public/approved profiles only; bounded pagination; safe search filters | No results, invalid filters, search unavailable |
| Select hospital | Patient | hospitals/branches | Selected display context only | Hospital active and bookable | Hospital paused, branch closed |
| View availability | Patient | schedules, appointments | No persistent change | Local timezone explicit; exclude leave/holiday/reserved slots; avoid exposing other patients | Stale availability, schedule missing, service error |
| Select slot | Patient | appointments/schedules | Optional short-lived reservation/hold | Slot still bookable; hold expiry; one actor/idempotency key | Slot taken, hold expired, rate limit |
| Book appointment | Patient | appointments | Appointment plus initial status history | Patient may book self/dependent; doctor/branch valid; transaction prevents overlap; idempotency | Concurrent booking conflict, eligibility issue, database unavailable |
| Payment | Patient | billing/payments/provider adapter | Invoice/payment intent and provider reference | Amount/currency from server; idempotency; never accept client-calculated price as authority | Decline, timeout, pending result, duplicate callback |
| Confirmation | Patient/system | appointments, notifications | Confirmed/pending-payment state and delivery attempt | Confirm only according to payment/hospital policy; idempotent notification | Payment pending, notification failure (booking remains queryable) |
| Hospital check-in | Patient/receptionist | queues, appointments | Checked-in state and queue token | Correct date/branch; authorized patient/staff; only valid appointment | Too early/late, duplicate check-in, cancelled/no-show appointment |
| Queue tracking | Patient | queues | Usually read-only queue position/status | Reveal only own token and safe estimate; no peer identities | Queue delayed, appointment not checked in |
| Consultation | Doctor/patient | encounters, clinical notes | Encounter and clinician-authored note | Active care relationship; consent/authority; assigned provider; encounter state | Wrong patient, encounter already closed, provider access revoked |
| Prescription | Doctor | prescriptions, medications | Versioned prescription/items | Authorized prescriber; required fields; medication catalogue/status | Invalid medication, missing instructions, unauthorized signing |
| Invoice | Billing system/staff | billing/payments | Invoice and item snapshots; payment status | Server-side price list, currency and tenant; duplicate charge prevention | Price changed, payment mismatch, invoice conflict |
| Health timeline | Patient | encounters, documents, prescriptions | Read-only projection of shared records | Own/dependent authority; only released/authorized resources | Consent revoked, record pending release, access denied |

Patient-visible failures should be clear without leaking another person's identity or the existence of another tenant's resource. Each sensitive read and state-changing operation should include request correlation and appropriate audit events.
