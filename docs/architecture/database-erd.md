# Initial PostgreSQL Database ERD

This logical ERD covers the explicitly scoped MVP: identity/authentication, hospital tenants and branches, scoped staff roles, doctor/patient profiles, availability, and appointments. It is not a migration specification. All primary keys are UUIDs. Tables use `created_at timestamptz` and `updated_at timestamptz` where mutable; append-only histories use `created_at`. Prefer restrictive foreign keys for retained records. Add `deleted_at` only for safely reversible profile/master data.

## ER diagram

```mermaid
erDiagram
  USERS {
    uuid id PK
    string email_normalized UK
    string phone_normalized UK
    string password_hash
    string status
    timestamptz email_verified_at
    timestamptz created_at
    timestamptz updated_at
  }
  ROLES {
    uuid id PK
    string code UK
    string name
    string scope_type
  }
  PERMISSIONS {
    uuid id PK
    string code UK
    string description
  }
  ROLE_PERMISSIONS {
    uuid role_id PK, FK
    uuid permission_id PK, FK
  }
  HOSPITALS {
    uuid id PK
    string name
    string status
    string slug UK
    timestamptz created_at
    timestamptz updated_at
  }
  BRANCHES {
    uuid id PK
    uuid tenant_id FK
    string name
    string timezone
    string status
    timestamptz created_at
    timestamptz updated_at
  }
  MEMBERSHIPS {
    uuid id PK
    uuid tenant_id FK
    uuid user_id FK
    uuid branch_id FK
    string status
    timestamptz created_at
    timestamptz updated_at
  }
  MEMBERSHIP_ROLES {
    uuid membership_id PK, FK
    uuid role_id PK, FK
  }
  PLATFORM_USER_ROLES {
    uuid user_id PK, FK
    uuid role_id PK, FK
    uuid assigned_by FK
    timestamptz created_at
  }
  AUTH_SESSIONS {
    uuid id PK
    uuid user_id FK
    string refresh_token_hash UK
    uuid token_family_id
    timestamptz expires_at
    timestamptz revoked_at
    timestamptz created_at
  }
  DOCTORS {
    uuid id PK
    uuid user_id FK
    string display_name
    string license_reference
    string status
    timestamptz created_at
    timestamptz updated_at
  }
  DOCTOR_AFFILIATIONS {
    uuid id PK
    uuid tenant_id FK
    uuid doctor_id FK
    uuid branch_id FK
    uuid department_id FK
    int consultation_fee_minor
    string currency
    string status
  }
  DEPARTMENTS {
    uuid id PK
    uuid tenant_id FK
    uuid branch_id FK
    string name
    string status
  }
  PATIENTS {
    uuid id PK
    uuid user_id FK
    string display_name
    date date_of_birth
    string status
    timestamptz created_at
    timestamptz updated_at
  }
  PATIENT_REGISTRATIONS {
    uuid id PK
    uuid tenant_id FK
    uuid patient_id FK
    string local_reference
    string status
    timestamptz created_at
  }
  DOCTOR_SCHEDULES {
    uuid id PK
    uuid tenant_id FK
    uuid doctor_affiliation_id FK
    int weekday
    time local_start
    time local_end
    int slot_minutes
    date effective_from
    date effective_to
    string timezone
    string status
  }
  SCHEDULE_EXCEPTIONS {
    uuid id PK
    uuid tenant_id FK
    uuid doctor_affiliation_id FK
    timestamptz starts_at
    timestamptz ends_at
    string type
    string reason_code
    uuid created_by FK
  }
  APPOINTMENTS {
    uuid id PK
    uuid tenant_id FK
    uuid patient_id FK
    uuid doctor_affiliation_id FK
    uuid branch_id FK
    timestamptz starts_at
    timestamptz ends_at
    string status
    uuid created_by FK
    string idempotency_key
    timestamptz cancelled_at
    string cancellation_reason
    timestamptz created_at
    timestamptz updated_at
  }
  APPOINTMENT_STATUS_HISTORY {
    uuid id PK
    uuid tenant_id FK
    uuid appointment_id FK
    string from_status
    string to_status
    uuid actor_user_id FK
    string reason
    timestamptz created_at
  }
  AUDIT_EVENTS {
    uuid id PK
    uuid actor_user_id FK
    uuid tenant_id FK
    string action_code
    string resource_type
    uuid resource_id
    string outcome
    string request_id
    timestamptz created_at
  }

  ROLES ||--o{ ROLE_PERMISSIONS : grants
  PERMISSIONS ||--o{ ROLE_PERMISSIONS : assigned
  USERS ||--o{ MEMBERSHIPS : has
  HOSPITALS ||--o{ BRANCHES : contains
  HOSPITALS ||--o{ MEMBERSHIPS : scopes
  BRANCHES o|--o{ MEMBERSHIPS : limits
  MEMBERSHIPS ||--o{ MEMBERSHIP_ROLES : assigned
  ROLES ||--o{ MEMBERSHIP_ROLES : includes
  USERS ||--o{ PLATFORM_USER_ROLES : receives
  ROLES ||--o{ PLATFORM_USER_ROLES : grants
  USERS ||--o{ AUTH_SESSIONS : authenticates
  USERS ||--o| DOCTORS : identity
  DOCTORS ||--o{ DOCTOR_AFFILIATIONS : practices
  HOSPITALS ||--o{ DOCTOR_AFFILIATIONS : engages
  BRANCHES ||--o{ DOCTOR_AFFILIATIONS : locates
  BRANCHES ||--o{ DEPARTMENTS : hosts
  DEPARTMENTS o|--o{ DOCTOR_AFFILIATIONS : organizes
  USERS ||--o| PATIENTS : account
  PATIENTS ||--o{ PATIENT_REGISTRATIONS : registers
  HOSPITALS ||--o{ PATIENT_REGISTRATIONS : registers_at
  DOCTOR_AFFILIATIONS ||--o{ DOCTOR_SCHEDULES : publishes
  DOCTOR_AFFILIATIONS ||--o{ SCHEDULE_EXCEPTIONS : blocks_or_adds
  PATIENTS ||--o{ APPOINTMENTS : books
  DOCTOR_AFFILIATIONS ||--o{ APPOINTMENTS : receives
  BRANCHES ||--o{ APPOINTMENTS : hosts
  APPOINTMENTS ||--o{ APPOINTMENT_STATUS_HISTORY : records
  USERS o|--o{ AUDIT_EVENTS : acts
  HOSPITALS o|--o{ AUDIT_EVENTS : scopes
```

## Keys, relationships, and constraints

- `hospitals.id` **is** the tenant UUID. This resolves the earlier open choice in `docs/database/database-design.md`; do not maintain a duplicate hospital `tenant_id`.
- `users` represent platform identities. A doctor is a professional profile linked to a user and may have affiliations in multiple tenants. A patient identity may also be global; `patient_registrations` represents its relationship to a hospital.
- `memberships` assign a user to a tenant and optionally a branch. `membership_roles` joins scoped membership to role. `SUPER_ADMIN` is assigned through `platform_user_roles` and does not require tenant membership. Role scope types must prevent platform-only roles from being granted through a hospital membership.
- `auth_sessions` stores only refresh-token hashes and rotation family metadata; raw refresh credentials are never persisted. Revoke prior rows on rotation/logout/recovery as policy defines.
- `audit_events` is append-only through application interfaces and captures minimum security/business metadata. Platform events may have a null tenant; tenant-scoped events reference `hospitals.id`.
- Tenant-owned rows include `tenant_id`. Add `UNIQUE (tenant_id, id)` and composite foreign keys such as `(tenant_id, branch_id) REFERENCES branches(tenant_id,id)` wherever parent and child tenant consistency must be guaranteed. The diagram omits these composite details for readability.
- Use `UNIQUE (tenant_id, normalized_name)` for branch/department names where required, `UNIQUE (tenant_id, user_id)` for one active membership per scope, and unique doctor affiliation/branch combinations according to business policy.
- Check constraints: `ends_at > starts_at`, `local_end > local_start` (overnight schedules represented as separate intervals), `slot_minutes > 0`, valid weekday range, positive fee, valid status values, and `effective_to IS NULL OR effective_to >= effective_from`.
- Appointment `status` has a controlled transition policy. Keep status history append-only. Cancellation and rescheduling update the appointment and append history in one transaction; rescheduling may additionally record the prior interval in history/audit.
- Prevent double booking with a PostgreSQL exclusion constraint on overlapping time ranges for the same tenant and doctor affiliation, scoped to reserving statuses (for example `PENDING`, `CONFIRMED`). If required PostgreSQL extensions or hold semantics are not selected, use a transaction-safe slot reservation/locking design with an equivalent database uniqueness guarantee.
- Unique idempotency scope: `(tenant_id, created_by, idempotency_key)` for booking requests. A replay returns the original result; mismatched payload reuse is a conflict.
- All FKs are indexed. Add schedule indexes by `(tenant_id, doctor_affiliation_id, effective_from)` and appointment indexes by `(tenant_id, doctor_affiliation_id, starts_at)` and `(tenant_id, patient_id, starts_at DESC)`.
- Instants use `timestamptz`; recurring schedules retain local wall-clock times plus an IANA timezone. UUID generation should use PostgreSQL-supported UUID generation or application-generated UUIDs consistently.

## Out of scope

Clinical notes, diagnoses, prescriptions, encounters, queue tokens, billing, payments, documents, consents, lab, pharmacy, and inventory are deliberately absent from this initial ERD. Add them only with their workflow and authorization policies in a later phase. This ERD is a design artifact, not a claim of regulatory compliance.
