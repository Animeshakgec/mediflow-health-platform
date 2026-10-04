# Module Boundaries

Modules are business capabilities inside one deployable backend. A module owns its rules and writes; other modules use its service interface or documented events instead of updating its tables directly. Shared primitives belong in `common`, not a catch-all business module.

| Module | Responsibility / main entities | Dependencies | Important rules |
|---|---|---|---|
| auth | Credentials, sessions, refresh-token families | users, audit | Hash secrets; rotate/revoke refresh tokens; never treat token claims as current permissions indefinitely. |
| users | Platform identity, contacts, account state | auth | Unique normalized login identifiers; separate account identity from patient/staff profiles. |
| hospitals | Tenant lifecycle/settings | users, audit | Tenant UUID immutable; suspend tenant with explicit operational policy. |
| branches | Physical/operational sites | hospitals | Branch belongs to exactly one tenant; enforce tenant consistency. |
| departments | Hospital service organization | branches | Department belongs to tenant and may be branch-specific. |
| doctors | Doctor professional profile and staff assignment | users, hospitals, branches, departments | Credentials/status require verification workflow; doctor may work in multiple tenants. |
| patients | Patient profile and care identity | users, consent | Avoid duplicate identity assumptions; access is relationship-scoped. |
| appointments | Booking lifecycle and status history | patients, doctors, schedules, queues, billing/payments, notifications | Prevent double booking transactionally; state changes are explicit and idempotent. |
| schedules | Doctor availability, exceptions, holidays/leave | doctors, branches | Timezone is explicit; exception overrides recurring schedule; no booking outside published capacity. |
| queues | Check-in, token and queue status | appointments, branches, encounters | Operational tokens scoped to date/location; don't expose other patients in public views. |
| encounters | Care visit lifecycle | appointments, patients, doctors | Tenant and care relationship validated; closing/reopening policy explicit. |
| clinical notes | Authored encounter notes | encounters, users, audit | Attribution and timestamps immutable; amendment creates history, not silent overwrite. |
| diagnoses | Encounter diagnoses | encounters, clinical vocabularies (later) | Preserve author/source and whether provisional/final. |
| prescriptions | Medication plan and items | encounters, medications, doctors | Prescriber authorization; immutable issued version; corrections/revocations traceable. |
| medications | Medication catalogue and formulation | pharmacy | Keep catalogue separate from prescribed items and dispensed stock. |
| documents | Metadata, versions and object references | patients, encounters, consent, S3 adapter, audit | Private object storage; authorize each operation; do not store file bytes in PostgreSQL. |
| consent | Grants, purpose, scope, expiry and revocation | patients, documents, audit | Consent is explicit and versioned; revocation affects future access. |
| laboratory | Orders, specimens, results | encounters, patients, notifications | Result release/review state distinct from technician entry. V1. |
| pharmacy | Dispensing events | prescriptions, medications, inventory | Dispense only valid prescription items; record partial fills and actor. V1. |
| inventory | Stock and movements | pharmacy, hospitals, branches | Track immutable movements; stock balance reconciled from movements. V1. |
| billing | Services, price lists, invoices and line items | appointments, encounters, payments | Preserve price snapshot at invoice time; no direct card data. |
| payments | Gateway intent/status/refund references | billing, integration adapter, audit | Idempotent provider callbacks; reconcile asynchronous payment states. |
| admissions | Inpatient admission lifecycle | patients, beds, billing | Future boundary; do not force MVP outpatient flows through it. |
| beds | Bed resources and assignments | branches, admissions | Enforce non-overlapping active assignments. Future boundary. |
| nursing | Nursing observations/tasks | encounters, admissions, users | Attribute entries; field-level role policy. V1/future. |
| notifications | Preferences, templates, delivery attempts | appointments, users, queue/providers | Queue delivery; retries idempotently; avoid sensitive content in messages. |
| audit logs | Security and business access/change events | all modules | Append-only application interface; avoid secrets and excessive clinical payloads. |

MVP implementation can combine small related modules in a code package if boundaries remain clear. Extracting a module into a service is a later operational decision, not a Phase 0 requirement.
