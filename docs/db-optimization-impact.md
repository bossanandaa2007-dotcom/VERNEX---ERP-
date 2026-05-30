# DB Optimization Impact Map

This document records the storage-optimization changes and the app areas affected by each table or column.

## Changes Applied

| Table | Removed / redirected | Replacement dependency | Affected functionality |
| --- | --- | --- | --- |
| `library_books` | Dropped legacy table | `librarian_books` | Librarian book list, issue book, return book, reminders |
| `fee_records` | Dropped legacy table | `student_fee_records` with `fee_categories` and `accountant_notes` | Finance dashboard, fee status updates, fee reminders |
| `librarians` | Dropped unused table | `profiles.role = 'Librarian'` | Librarian login/permissions |
| `assignment_submissions.student_email` | Dropped duplicate email | `assignment_submissions.student_id -> profiles.email` | Student assignment submission status, teacher submission export |
| `attendance_records.student_name` | Dropped duplicate name | `attendance_records.student_id -> students.name` | Manual attendance, AI attendance save, attendance reports |
| `student_marks.student_name` | Dropped duplicate name | `student_marks.student_id -> students.name` | Marks entry, student marks, teacher performance, admin marks dashboard |
| `student_marks.class_name` | Dropped duplicate class name | `student_marks.section_id -> sections.name` | Marks filtering, marks permissions, class exam marks |
| `complaints.student_name` | Dropped duplicate name | `complaints.student_id -> students/profile name` through `complaint_details` | Student complaint list, teacher/governing complaint inbox |
| `complaints.class_name` | Dropped duplicate class name | `students.section_id -> sections.name` through `complaint_details` | Complaint routing display and inbox filtering |
| `complaints.section` | Dropped duplicate section text | Derived from `sections.name` through `complaint_details` | Complaint display cards |
| `complaints.division` | Dropped duplicate division | Derived from `students.gender` through `complaint_details` | Complaint division display |
| `timetable_entries.teacher_profile_id` | Dropped duplicate profile reference | `timetable_entries.teacher_id -> teachers.profile_id` | Teacher timetable filtering and timetable RLS |

## Query Redirects

| Functionality | Old query source | New query source |
| --- | --- | --- |
| Assignment submission email | `assignment_submissions.student_email` | nested `profiles.email` via `student_id` |
| Finance fee loading | `student_fee_records` with fallback to `fee_records` | `student_fee_records` only |
| Complaint display | `complaints` denormalized columns | `complaint_details` view |
| Complaint creation | `submit_complaint` inserted denormalized student/class fields | `submit_complaint` inserts only IDs and complaint body |
| Marks by class | `student_marks.class_name` | `student_marks.section_id` joined to `sections.name` |
| Marks student labels | `student_marks.student_name` | `students.name` |
| Timetable teacher filter | `timetable_entries.teacher_profile_id` | `teachers.profile_id` joined through `teacher_id` |
| Attendance writes | writes `student_name` into attendance row | writes `student_id` only |

## Tables Kept Intentionally

| Table / field | Why it remains |
| --- | --- |
| `students.grade_id`, `students.class_id` | Finance and older grade/class architecture still use these in DB functions and migration logic. |
| `student_fee_records.grade_id`, `student_fee_records.class_id` | Needed for fee generation/filtering and indexed finance queries. |
| `section_teacher_assignments.teacher_profile_id` | Still used by recipient routing, auth context, leave routing, and several RLS helper functions. It can be removed later, but it requires a wider rewrite of leave, auth, routing, and teacher-scope policies. |
| `leave_requests.student_name`, `leave_requests.class_name`, `leave_requests.teacher_profile_id` | Leave request RPCs and staff inbox policies still depend on them. A separate leave-module refactor is safer. |
| `study_materials.class_name`, `study_materials.teacher_profile_id` | Current study-material scoping policies and frontend filters use both. |
| `assignments.class_name` | Assignment visibility is class-name based and used by policies and frontend filtering. |
| `librarian_books.status` | Derived from copy counts, but selected by UI and maintained by trigger for fast display. |

## Verification Needed After Applying Migration

1. Student login: open assignments and submit a Drive link.
2. Teacher login: export assignment submissions and enter marks.
3. Admin login: open institution marks dashboard and filter by class.
4. Student login: submit a complaint.
5. Teacher/governing login: open complaint inbox and resolve a complaint.
6. Teacher/student login: open timetable.
7. Accountant login: open finance dashboard, update fee status, and send reminders.
8. Librarian login: add/edit/delete books, issue a book, return it, and send reminders.
