# Authentication and Role-Based Access Control

## Identity model

`users` are platform identities with account status and normalized login identifiers. Passwords are stored only as strong one-way hashes (prefer Argon2id; use a maintained bcrypt configuration only if deployment constraints require it). Authentication does not imply permission to access a patient or hospital resource.

Use short-lived signed JWT access tokens with minimal claims: subject (`sub`), session ID (`sid`), token identifier (`jti`), issuer, audience, issued-at and expiry. Verify signature, issuer and audience. Phase 2 uses a single HS256 secret configured outside source control; key rotation and asymmetric signing are production deployment decisions. Keep refresh tokens opaque and high entropy, store only SHA-256 hashes, rotate on every use, detect reuse, and revoke the token family after reuse, logout, password change, or administrative disablement. Browser refresh tokens use HttpOnly cookies, Secure in production, SameSite=Lax by default, and origin checks on cookie-authenticated mutations. Access tokens are returned in the login/register response for in-memory client use; do not put credentials in logs.

Login, registration, refresh, logout, password recovery and verification endpoints must be rate-limited and return non-enumerating recovery responses. Require verified contact identity before sensitive account recovery or changes. Password reset invalidates existing sessions.

## Roles and responsibilities

| Role             | Scope and responsibility                                                                                        | Key restriction                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPER_ADMIN`    | Platform tenant provisioning and operational configuration                                                      | Platform-scoped; no routine clinical record access. Exceptional support access must be reasoned, time-limited, narrowly scoped, audited, and reviewed. |
| `HOSPITAL_ADMIN` | Manage assigned hospital, branches, staff memberships, doctor affiliations, schedules, and operational settings | Cannot access unrelated tenants; clinical access only if separately assigned a care role.                                                              |
| `DOCTOR`         | Manage own professional profile/availability and appointments assigned within active affiliations               | Patient access limited to the relevant care workflow; clinical work is deferred beyond MVP.                                                            |
| `NURSE`          | Future assigned care support and permitted observations                                                         | No prescribing by default and no hospital-wide unrestricted record access.                                                                             |
| `RECEPTIONIST`   | Patient registration/lookup and appointment coordination                                                        | Minimum necessary demographic and scheduling data; no clinical notes.                                                                                  |
| `LAB_TECHNICIAN` | Future assigned lab orders, samples and results                                                                 | Only identifiers and tests necessary for assigned work.                                                                                                |
| `PHARMACIST`     | Future prescription dispensing and pharmacy operations                                                          | No prescribing or broad chart access.                                                                                                                  |
| `BILLING_STAFF`  | Future invoices, payment status and authorized reconciliation                                                   | No clinical-note access or payment credential storage.                                                                                                 |
| `PATIENT`        | Own profile and own appointments                                                                                | No access to another patient's account without a verified legal/dependent relationship or explicit valid share.                                        |

Phase 2 seeds six role definitions: `SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, and `PATIENT`. Hospital roles are tenant-scoped through memberships. `SUPER_ADMIN` is platform-scoped; `PATIENT` is a global user role. Public registration can assign only `PATIENT`. Privileged assignments require a trusted server-side workflow; Phase 2 does not expose a role-assignment endpoint. Nurse and role-specific permission workflows remain unimplemented.

## Authorization layers

1. **Authentication:** verify account and token/session status.
2. **Capability/RBAC:** check an allow-listed permission (for example `appointment.create`, `doctor.schedule.manage`, `hospital.branch.update`) granted through an active scoped role.
3. **Tenant and branch scope:** establish tenant from a verified membership, never from a request body. A branch selector can only select a branch the membership permits.
4. **Resource relationship and state:** verify ownership, assigned doctor, patient registration/relationship, current resource state, and permitted transition.
5. **Field/purpose policy:** for future health data, check purpose and minimum-necessary field access; record sensitive reads.

Every operation checks authorization on the server. Return 401 for missing/invalid authentication and 403 for authenticated but forbidden actions. Use 404 when revealing cross-tenant resource existence would be unsafe. Super-admin is not a bypass to routine resource checks.

## MVP permission outline

| Capability                               | Patient            | Receptionist                  | Doctor                   | Hospital admin          | Super admin           |
| ---------------------------------------- | ------------------ | ----------------------------- | ------------------------ | ----------------------- | --------------------- |
| Read public hospital/doctor availability | Yes                | Yes                           | Yes                      | Yes                     | Yes                   |
| Manage tenant/branch profile             | No                 | No                            | No                       | Assigned tenant         | Platform provisioning |
| Manage staff and doctor affiliation      | No                 | No                            | No                       | Assigned tenant         | Platform support      |
| Manage own doctor availability           | No                 | No                            | Assigned affiliations    | Assigned tenant         | Platform support      |
| Read own profile/appointments            | Own only           | Operationally necessary       | Assigned appointments    | Operationally necessary | Metadata by default   |
| Create/cancel/reschedule appointment     | Own patient policy | On behalf of patient, audited | Assigned workflow policy | Assigned tenant policy  | No routine booking    |

Exact permission codes and patient booking rules are implementation decisions, but they must be explicit and documented before corresponding endpoints are enabled. Phase 2 provides reusable role/permission and tenant-membership middleware primitives, but does not grant application permissions or implement patient clinical-resource routes.

## Audit and session security

Audit authentication outcomes, account/security changes, role and membership changes, privileged actions, appointment lifecycle changes, and sensitive record access. Store actor, scope, action, resource identity, result, request ID, reason where required, and timestamp; do not store credentials or full health payloads. Phase 2 emits request logs without credentials but does not yet persist a dedicated audit-event table. See [logging strategy](logging-strategy.md).
