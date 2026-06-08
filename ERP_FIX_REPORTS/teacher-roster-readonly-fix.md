# Teacher Roster Read-Only Fix

## Files Changed
- `frontend/src/modules/teachers/TeacherClasses.tsx`

## Exact Condition Used
- The `/teacher/classes` route renders `TeacherClasses` behind `ProtectedRoute allowedRoles={['Teacher']}`.
- Inside `TeacherClasses`, student creation controls were removed from the Teacher-only roster page entirely.
- The remaining owned-class check is now only:
  - `canViewOwnedClassSubjectMap = !!activeSection && activeSection.name === ownedClass`
- That condition only controls the read-only owned class subject map. It no longer enables student creation.

## Fix Implemented
- Removed Teacher roster access to:
  - `Bulk Add`
  - `Add Student`
  - bulk import form
  - single student creation form
- Removed the component subscriptions to `addStudent` and `addStudents`.
- Removed `handleAddStudent` and `handleBulkAddStudents`, so the Teacher roster page has no student-create handler to trigger through UI bypass.
- Kept roster viewing, student details, average marks, attendance, and owned class subject map behavior.

## Admin Behavior Unchanged
- Admin routes and components were not changed.
- Admin student creation and bulk creation remain in the existing Admin pages/components.
- No backend schema or RLS changes were made.

## Teacher Roster Read-Only Confirmation
- Teacher can still view assigned classes and roster data.
- Teacher can still open student detail on mobile roster.
- Teacher can still see average marks and attendance values.
- Teacher can still see the owned class subject map when applicable.
- Teacher cannot see or open `Bulk Add` or `Add Student` on `/teacher/classes`.

## Lint/Build Result
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.
