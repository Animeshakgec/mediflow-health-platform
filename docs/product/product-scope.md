# Product Scope

## Product intent

MediFlow is a multi-tenant healthcare platform with a patient-facing application and an operational hospital platform. The first release validates a complete outpatient journey without requiring every hospital information system capability.

## MVP

### Patient platform

- Registration and login; patient profile and contact details.
- Discover participating hospitals and doctors; view availability.
- Book, view, and cancel appointments under published rules.
- Appointment confirmation and basic status/queue token tracking.
- Appointment history and a basic health timeline.
- Consultation summary and digital prescription access when shared by the treating provider.
- Notifications for booking changes and reminders (initially email; SMS provider remains a deployment choice).
- Basic document metadata and secure access design; enable uploads only when private storage controls are implemented.

### Hospital platform

- Hospital and branch setup; departments and doctor/staff memberships.
- Doctor availability and schedule exceptions.
- Patient lookup limited to an authorized care/operational relationship.
- Appointment management, check-in and simple queue/token operations.
- Outpatient encounter, clinical note, diagnosis and prescription workflow.
- Basic services, invoice and payment status; payment gateway integration behind an adapter.
- Operational audit events and essential reports.

### MVP exclusions

Full EMR migration, inpatient operations, automated clinical decision support, inventory, claims, complex billing, and external health-record exchange are not required to validate the initial flow. MVP scope should be frozen before Phase 1 implementation.

## V1

- Appointment history refinements, family/dependent profiles and explicit consent-based record sharing.
- Queue estimates and richer hospital operations.
- Laboratory orders/results and laboratory staff workflow.
- Pharmacy dispensing and basic inventory tracking.
- Billing refinements, refunds, richer reports/analytics, and document version management.
- Additional notification channels and delivery preferences.
- More complete doctor, nurse, receptionist and billing workflows.

## Future / post-MVP

- AI assistant and clinical decision support.
- OCR and automated document extraction.
- FHIR interoperability and ABDM-related integrations.
- Telemedicine.
- Insurance/TPA workflows.
- Advanced analytics and cross-facility insights.
- Native mobile applications.
- Inpatient admissions, beds and nursing depth beyond placeholders needed for extensibility.

These items must use stable module/API boundaries and must not drive MVP infrastructure or data-model complexity prematurely. High-risk clinical or interoperability capabilities require separate discovery and validation.

## Coverage of requested capabilities

| Capability | Release |
|---|---|
| Patient registration/login, profile, doctor/hospital discovery, booking, appointment history, queue/token tracking | MVP |
| Consultation history, digital prescriptions, basic notifications, appointment/payment status | MVP |
| Family members/dependents and consent-based record sharing | V1, after authority and consent rules are defined |
| Patient laboratory reports, richer health-document lifecycle and document sharing | V1; secure document authorization foundation is required first |
| Hospital/branch/department/doctor/staff management, patient lookup, scheduling, appointments and queue management | MVP |
| Basic consultation/EMR notes, diagnoses and prescriptions | MVP |
| Laboratory, pharmacy, inventory and richer billing | V1 |
| Admissions, beds and nursing workflows | Future, after outpatient workflows are stable |
| Reports and analytics | Essential operational reports in MVP; advanced analytics in Future |
| Payments | MVP payment status and provider boundary; exact payment collection policy is unresolved |
| AI assistant, OCR, FHIR, ABDM, telemedicine, insurance/TPA, mobile app | Future / post-MVP |

## Scope principles

1. Backend is the source of truth for workflows and permissions.
2. Build outpatient operations first; keep the initial deployment a modular monolith.
3. Store clinical facts with provenance and timestamps; avoid pretending free-text notes are a complete EMR.
4. Keep provider integrations behind adapters and allow manual operational fallback where feasible.
5. Detailed jurisdiction, privacy, payment and retention obligations remain open until target launch markets are confirmed.
