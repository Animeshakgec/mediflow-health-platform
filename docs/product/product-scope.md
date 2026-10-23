# Product Scope

## Product intent

MediFlow is a portfolio and freelancing project for a secure hospital and digital health platform connecting patients, doctors, hospitals, laboratories, pharmacies, and administrative teams. The product will be delivered in phases; the long-term vision does not define the first release.

## Confirmed MVP

The first MVP includes:

- User registration/login and account lifecycle foundations.
- Hospital and branch management.
- Doctor management and hospital/branch affiliations.
- Patient profiles and hospital registration relationships.
- Doctor recurring availability and schedule exceptions.
- Appointment availability, booking, cancellation, and rescheduling.
- Tenant-aware authorization, input validation, status/audit history, and API documentation foundations.

The MVP does not include queue/check-in, encounters or clinical notes, prescriptions, billing or payment processing, laboratory, pharmacy/inventory, medical document upload/sharing, AI, or frontend implementation during the current architecture phase. Do not expand MVP scope without an explicit product decision.

## Later phases

1. Patient and hospital web clients for the MVP journeys.
2. OPD check-in and queue management.
3. Outpatient encounters, clinical notes, diagnoses, and prescriptions.
4. Billing and payment-provider integration.
5. Consent-based documents and patient health records.
6. Laboratory, pharmacy, inventory, notifications, and operational reporting.
7. Admissions/beds, advanced analytics, AI-assisted administrative workflows, and FHIR/other interoperability after discovery.

These phases require their own workflow, data, authorization, privacy, and operational design. They must not force unnecessary infrastructure into the MVP.

## Roles

MVP role definitions are `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `RECEPTIONIST`, and `PATIENT`. `NURSE`, `LAB_TECHNICIAN`, `PHARMACIST`, and `BILLING_STAFF` are reserved for later modules and should receive no unused permissions in MVP. See [authentication and RBAC](../architecture/authentication-and-rbac.md).

## Scope principles

1. The backend is authoritative for workflows and permissions.
2. Start as a JavaScript modular monolith; do not introduce microservices.
3. Keep patient identity separable from hospital-specific registration so a person can use multiple hospitals under explicit access rules.
4. Preserve attribution and status history for important appointment/security actions.
5. Healthcare privacy and security must be designed from the start, but this project documentation is not a regulatory-compliance claim.
6. Confirm target jurisdiction, login identifier policy, booking/slot hold policy, hosting, retention, and applicable privacy obligations before production use.
