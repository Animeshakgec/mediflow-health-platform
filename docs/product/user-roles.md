# User Roles and Authorization Concepts

Roles provide a starting set of permissions. A role alone never grants access across tenants or to every resource in its module. Assignments should be scoped to a hospital and optionally a branch; patient access is relationship- and purpose-based.

| Role | Purpose and responsibilities | Modules / permissions | Restrictions |
|---|---|---|---|
| `SUPER_ADMIN` | Operates the platform: tenant provisioning, platform configuration, support and incident review | Platform-level hospital lifecycle and operational metadata; tightly controlled support access | No routine clinical-record browsing. Any exceptional break-glass access requires reason, narrow duration/scope and audit trail. Cannot silently impersonate users. |
| `HOSPITAL_ADMIN` | Manages one hospital organization and branches | Hospital, branch, department, staff membership, schedules, operational settings and reports | Scoped to assigned tenant; no platform configuration or unrelated hospital access; clinical data only as needed for assigned duties. |
| `DOCTOR` | Provides clinical care | Own schedule, relevant appointments, patient history, encounters, notes, diagnoses, prescriptions and permitted orders | Access only patients with a valid care relationship and assigned scope; cannot administer unrelated staff or tenants. |
| `NURSE` | Supports care delivery | Assigned queues/encounters, permitted vitals, nursing observations and patient-care tasks | No prescribing unless separately authorized under applicable policy; no unrestricted records or tenant administration. |
| `RECEPTIONIST` | Coordinates front desk and appointments | Patient identity/contact lookup, appointment booking/check-in, queue operations | Minimum necessary demographic/operational data; no clinical notes, diagnoses or prescriptions unless specifically required and granted. |
| `LAB_TECHNICIAN` | Processes laboratory orders and results | Assigned lab orders, specimen/status/result entry | Access only necessary patient identifiers and ordered tests; results follow review/release policy; no unrelated chart access. |
| `PHARMACIST` | Dispenses prescribed medication | Prescriptions, dispensing, medication catalogue and permitted stock operations | No prescribing or broad clinical record access; only information needed for safe dispensing. |
| `BILLING_STAFF` | Manages charges and payment reconciliation | Services, invoices, payment status, refunds subject to approval | No clinical note access; payment credentials are never stored; scoped to assigned tenant/branch. |
| `PATIENT` | Manages own account and health interactions | Own profile, appointments, shared records, consent, dependents where legally authorized, payments | Cannot access another patient's records without a verified dependent/legal relationship or explicit valid share; cannot access internal hospital workflows. |

## Authorization terms

- **Authentication** proves which account is making a request (for example, validated access token plus session state). It does not establish that the account may see a record.
- **Role-based authorization (RBAC)** maps a user's scoped role to broad capabilities such as `appointment.read` or `invoice.refund`.
- **Resource-level authorization** checks the specific record and relationship: ownership, assigned care, branch assignment, consent, purpose, state transition and field sensitivity.
- **Tenant-level authorization** ensures the actor is operating within an active hospital organization and that all referenced data belongs to that tenant. Patient-owned resources require an explicit, separately defined cross-tenant relationship when a patient uses multiple hospitals.

Every endpoint must apply the relevant checks on the server. Denials should avoid exposing whether another tenant's record exists. Privileged access and sensitive record reads must be auditable.
