# API Module Map (Planned)

Base prefix for every endpoint: `/api/v1`. This document names resource areas and responsibilities, not a final endpoint contract. Detailed schemas and OpenAPI definitions come with implementation.

| Path | Responsibility |
|---|---|
| `/auth` | Registration, login, refresh, logout, recovery and verification |
| `/users` | Account profile and preferences; self-service scope by default |
| `/hospitals` | Public discovery and privileged tenant administration |
| `/branches` | Hospital locations, timezone and operational status |
| `/departments` | Department discovery and administration |
| `/doctors` | Doctor profiles, search and authorized management |
| `/patients` | Own profile, dependent relationships and permitted staff lookup |
| `/appointments` | Availability-backed booking, cancellation, rescheduling and history |
| `/schedules` | Doctor recurring availability and exceptions |
| `/queues` | Check-in, token status and authorized queue operations |
| `/encounters` | Visit lifecycle and encounter summary |
| `/clinical-notes` | Authored notes, signing and amendments |
| `/diagnoses` | Encounter diagnosis records |
| `/prescriptions` | Prescriptions and items; pharmacy-facing access policy |
| `/medications` | Medication catalogue/search |
| `/documents` | Metadata, upload initiation/completion, versions and authorized download links |
| `/consents` | Grant, inspect and revoke record sharing |
| `/laboratory` | Orders, specimens and results (V1) |
| `/pharmacy` | Dispensing workflow (V1) |
| `/inventory` | Stock catalogue/movements (V1) |
| `/billing` | Services, invoices, line items and billing operations |
| `/payments` | Payment initiation/status/refund operations through provider adapter |
| `/admissions` | Inpatient admission lifecycle (future) |
| `/beds` | Bed resources and assignments (future) |
| `/nursing` | Nursing observations and tasks (V1/future) |
| `/notifications` | Patient preferences and delivery status where appropriate |
| `/audit-logs` | Restricted, audited operational/security audit queries |

Prefer noun resources and standard methods. Use explicit nested routes for bounded actions such as appointment cancellation or document upload sessions. All routes enforce tenant/resource policies and use the common envelopes in [API conventions](api-conventions.md). Never expose audit or clinical endpoints simply because a path is listed here.
