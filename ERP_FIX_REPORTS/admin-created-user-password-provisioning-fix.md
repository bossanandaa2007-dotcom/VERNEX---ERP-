# Admin-Created Teacher/Student Password Provisioning Fix

## Files Changed

- `frontend/src/modules/teachers/TeacherList.tsx`
- `frontend/src/modules/students/StudentList.tsx`
- `frontend/src/modules/classes/ClassesDashboard.tsx`
- `frontend/src/services/schoolData.ts`
- `frontend/src/store/useClassStore.ts`
- `backend/supabase/migrations/20260608_admin_created_user_password_provisioning.sql`
- `backend/supabase/migrations/20260608_reload_admin_create_user_rpc_schema.sql`

## Existing Provisioning Flow Found

- Teacher creation previously inserted a `teachers` row from the frontend and then called `provision_teacher_login`.
- Student creation previously inserted a `students` row from the frontend and then called `provision_student_login`.
- Existing SQL provisioning functions created Supabase Auth rows with hardcoded default passwords like `Teacher@123` and `Student@123`.
- Student inserts also have an existing trigger that guarantees login provisioning with the default student password.

## RPC / Backend Flow Used

- Added admin-only RPC flow:
  - `admin_create_teacher_with_login(...)`
  - `admin_create_student_with_login(...)`
- Added password-aware provisioning helpers:
  - `provision_teacher_login_with_password(...)`
  - `provision_student_login_with_password(...)`
- The frontend sends the password only to these RPCs. It no longer inserts the single-created teacher/student first and then provisions with the default password.
- The RPCs require `public.current_profile_role() = 'Admin'` before creating or provisioning accounts.
- Added an explicit PostgREST schema-cache reload with `notify pgrst, 'reload schema';` so Supabase can find the new RPC signatures after migration.

## Password Handling

- Admin create Teacher and Student forms now include:
  - Password
  - Confirm password
- Frontend validation enforces:
  - Minimum 8 characters
  - Password and confirm password must match
- Student single-create form also requires DB-required fields before submit:
  - Name
  - Email
  - Roll number
  - DOB
  - Level
  - Section
  - Contact and guardian details
  - Address
- SQL validation also enforces minimum 8 characters.
- SQL validation now returns clear student/teacher required-field errors before low-level database constraints.
- Passwords are read from uncontrolled form fields and passed directly to the create call.
- Submit buttons are disabled during create to prevent double submit.
- Success and failure messages are shown without displaying the password.
- Supabase/RPC error objects are now displayed by message instead of collapsing to generic fallback text like `Failed to add student`.

## Plaintext Password Storage

- Plaintext password is not stored in `teachers`, `students`, or `profiles`.
- Plaintext password is not logged.
- Plaintext password is not returned from RPC responses.
- Auth password is stored only as `auth.users.encrypted_password` using the existing Supabase Auth-compatible SQL provisioning pattern with `extensions.crypt(...)`.

## Service Role Exposure

- No service-role key was added to frontend code.
- No frontend environment change was made.
- No RLS policies were weakened or broadened.

## Teacher Creation Test Result

- Code path verified:
  - Admin create teacher form collects password and confirm password.
  - Form validates password before submit.
  - `createTeacherRecord` calls `admin_create_teacher_with_login`.
  - RPC creates/links Auth user, `profiles` row with role `Teacher`, and `teachers.profile_id`.
  - Teacher can use the admin-set password once the migration is applied.

## Student Creation Test Result

- Code path verified:
  - Admin create student form collects password and confirm password.
  - Form validates password before submit.
  - Form blocks missing DOB/level/section and other required database fields before submit.
  - `createStudentRecord` calls `admin_create_student_with_login`.
  - RPC creates/links Auth user, `profiles` row with role `Student`, and `students.profile_id`.
  - Student can use the admin-set password once the migration is applied.

## Lint / Build Result

- `cd frontend && npm run lint`: Passed after the screenshot correction.
- `cd frontend && npm run build`: Passed after the screenshot correction.

## Remaining Caveat

- Bulk student import was not changed. It continues to use the existing bulk insert/provisioning behavior and default-login trigger. This fix is scoped to the Admin single-create Teacher and Student flows requested.
- If Supabase still reports `Could not find the function public.admin_create_student_with_login(...) in the schema cache`, apply the latest migration `20260608_reload_admin_create_user_rpc_schema.sql` or manually run `notify pgrst, 'reload schema';` after confirming `20260608_admin_created_user_password_provisioning.sql` has been applied.
