# 13 - Pilot-Size Load Re-Test

Date: 2026-06-07

## Pilot Load Assumptions

- One slave copy per school.
- One Supabase project/database per school.
- Test scale is per school, not all pilot schools in one database.
- Target school data: around 300 students, 20 staff, realistic attendance, marks, fees, library, events, and materials.

## Test Data Available or Missing

| Item | Status | Notes |
| --- | --- | --- |
| 300-student school dataset | MISSING | No pilot-scale local or hosted dataset was available. |
| 20-staff dataset | MISSING | No pilot-scale staff dataset was available. |
| Realistic attendance/marks/fees/library/events/materials | MISSING | Source has seed/demo data, but not a verified pilot-scale test dataset. |
| Live school Supabase project | BLOCKED | No hosted per-school test project credentials were available for live testing. |

## Pages Inspected / Tested

| Page / Area | Source Inspection | Live Browser / Load Result |
| --- | --- | --- |
| Dashboard | Data services are Supabase-backed. | BLOCKED |
| Student list | Student service can fetch/order students. | BLOCKED |
| Teacher class pages | Teacher/class services use class/section data. | BLOCKED |
| Attendance page | Attendance service supports full class sheet and upsert. | BLOCKED |
| Marks entry page | Marks service supports class/subject/exam records. | BLOCKED |
| Fees page | Fee service reads `student_fee_records` and related tables. | BLOCKED |
| Library books/issues | Library services use books/issues/reminders RPCs/tables. | BLOCKED |
| Reports page | Report behavior requires live data verification. | BLOCKED |
| Mobile at 390px | Not executed. | BLOCKED |

## Performance Risks Found

| Risk | Severity | Notes |
| --- | --- | --- |
| No pilot-scale execution evidence | HIGH | Cannot approve performance without running with about 300 students and realistic related records. |
| Full-list Supabase queries | MEDIUM | Some pages fetch broad lists, acceptable for a small single-school database but should be measured at 300 students. |
| Table-heavy mobile pages | MEDIUM | Attendance, marks, fees, reports, and library pages need 390px overflow testing. |
| Console/network unknowns | MEDIUM | Supabase schema/RLS errors require live browser verification. |

## Manual / Browser Test Results

Not executed. No live pilot-size Supabase project, seeded 300-student dataset, or browser session with role accounts was available.

## Suggested Concurrency Scenario

Manual status values: PASS / FAIL / BLOCKED

| Scenario | Expected Result | Manual Status | Notes |
| --- | --- | --- | --- |
| 5 teachers marking attendance/marks | Saves complete without stuck states or repeated errors. | BLOCKED |  |
| 20 students viewing dashboard/materials | Pages load without white screens or repeated 401/403/400 errors. | BLOCKED |  |
| 1 accountant updating fees | Fee updates and reports remain responsive. | BLOCKED |  |
| 1 librarian issuing/returning books | Available copies and issue history stay accurate. | BLOCKED |  |
| 1 admin viewing reports | Reports load within acceptable pilot response time. | BLOCKED |  |

## Mobile Checklist

| Check | Manual Status | Notes |
| --- | --- | --- |
| 390px width loads main pages | BLOCKED |  |
| No horizontal overflow | BLOCKED |  |
| Buttons clickable | BLOCKED |  |
| Forms not cut off | BLOCKED |  |
| Modals fit screen | BLOCKED |  |
| Tables readable | BLOCKED |  |
| No stuck loading states | BLOCKED |  |
| No serious console/network errors | BLOCKED |  |

## Whether Pilot-Size Use Is Acceptable

BLOCKED.

For one school with fewer than 300 users, the architecture is plausible, but pilot-size use is not proven because live load/mobile/browser testing was not executed.

## Final Test 13 Status

BLOCKED.

Reason: real pilot-size load testing tools/data/environment were unavailable. A manual pilot load checklist was created as requested.
