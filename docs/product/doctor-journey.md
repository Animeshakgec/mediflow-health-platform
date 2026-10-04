# Doctor Journey (MVP)

| Step | Actor | Module/API | Data created or read | Validation | Failure cases |
|---|---|---|---|---|---|
| Doctor login | Doctor | auth, users | Session and access token | Active identity and tenant membership; rate limits | Invalid credentials, suspended membership, revoked token |
| View schedule | Doctor | schedules | Read-only schedule/exceptions | Doctor belongs to selected tenant/branch; timezone clear | Missing schedule, unauthorized branch, service unavailable |
| View appointments | Doctor | appointments | Appointment list | Tenant, doctor assignment, bounded date range; minimum necessary demographics | Invalid range, no assignment, stale state |
| View queue | Doctor | queues | Queue/token status | Assigned branch/date; no unnecessary disclosure of other patient details | Queue not open, branch mismatch |
| Open patient | Doctor | patients, consent, audit | Relevant profile and permitted history | Valid appointment/care relationship; patient identity confirmed; purpose recorded | Wrong patient, relationship absent, consent/authority issue |
| Review history | Doctor | encounters, notes, diagnoses, documents | Read-only clinical context | Resource-level policy, tenant/share grant, data-access log | Resource not shared, expired consent, unavailable document |
| Start consultation | Doctor | encounters | Encounter started/linked to appointment | Appointment checked in/eligible; actor assigned and licensed status active | Encounter exists already, appointment cancelled, concurrent update |
| Add clinical notes | Doctor | clinical notes | Draft note/version and author/time | Required fields and encounter open; validate size/input; note attribution | Encounter closed, validation error, save conflict |
| Record diagnosis | Doctor | diagnoses | Diagnosis rows | Encounter/tenant match; valid code or documented free-text policy | Invalid code, duplicate entry, unauthorized actor |
| Issue prescription | Doctor | prescriptions, medications | Versioned prescription/items | Prescriber permission, medication active, required dose/route/frequency | Incomplete order, stale medication, signing conflict |
| Place lab order (V1) | Doctor | laboratory | Lab order/items | Available test, encounter scope, clinical policy | Test unavailable, invalid specimen, module not enabled |
| Complete/follow up | Doctor | encounters, appointments, notifications | Encounter status, follow-up appointment/reminder | Required note/signing state; follow-up slot valid; notification is async | Unsaved note, slot conflict, notification provider failure |

Doctor actions are attributed and auditable. Clinical notes should support amendment history; corrections must not erase signed authorship. A doctor may have memberships at multiple hospitals, but every request is scoped to one verified tenant context.
