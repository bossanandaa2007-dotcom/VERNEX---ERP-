# Admin Create Student Login RPC And Password Eye Fix

## Exact Cause

The frontend calls `public.admin_create_student_with_login` with named arguments:

- `target_name`
- `target_roll_no`
- `target_email`
- `target_gender`
- `target_dob`
- `target_contact`
- `target_parent_name`
- `target_parent_contact`
- `target_address`
- `target_category_id`
- `target_section_id`
- `target_password`

The migration previously created the same RPC name, but with a different positional PostgreSQL signature order. The earlier migrations also used duplicate short version prefixes like `20260608_...`, which can make Supabase migration rollout/cache behavior unreliable if only one of those files is applied or tracked.

Supabase/PostgREST could not resolve the frontend RPC payload and reported:

`Could not find the function public.admin_create_student_with_login(...) in the schema cache`

## Function Signature Before

```sql
public.admin_create_student_with_login(
  target_name text,
  target_email text,
  target_password text,
  target_roll_no text,
  target_category_id text,
  target_section_id uuid,
  target_gender text,
  target_dob date,
  target_contact text,
  target_parent_name text,
  target_parent_contact text,
  target_address text
)
```

## Function Signature After

```sql
public.admin_create_student_with_login(
  target_address text,
  target_category_id text,
  target_contact text,
  target_dob text,
  target_email text,
  target_gender text,
  target_name text,
  target_parent_contact text,
  target_parent_name text,
  target_password text,
  target_roll_no text,
  target_section_id text
)
```

The hotfix function accepts the same string-shaped values sent by the form/RPC request, then casts internally:

```sql
parsed_dob := target_dob::date;
parsed_section_id := target_section_id::uuid;
```

This matches the schema-cache error argument list exactly:

```sql
public.admin_create_student_with_login(
  target_address,
  target_category_id,
  target_contact,
  target_dob,
  target_email,
  target_gender,
  target_name,
  target_parent_contact,
  target_parent_name,
  target_password,
  target_roll_no,
  target_section_id
)
```

Schema types confirmed from migrations:

- `students.category_id`: `text`
- `students.section_id`: `uuid`
- `students.dob`: `date`

## Files Changed

- `frontend/src/modules/students/StudentList.tsx`
- `frontend/src/services/schoolData.ts`
- `backend/supabase/migrations/20260608_admin_created_user_password_provisioning.sql`
- `backend/supabase/migrations/20260608_reload_admin_create_user_rpc_schema.sql`
- `backend/supabase/migrations/20260608_z_admin_create_student_rpc_signature_fix.sql`
- `backend/supabase/migrations/20260608124500_admin_create_student_login_rpc_hotfix.sql`

## Migration Changed / Created

- Updated the base provisioning migration so clean installs create the corrected student RPC signature.
- Updated schema reload migration to tolerate either signature during rollout.
- Added `20260608_z_admin_create_student_rpc_signature_fix.sql` to:
  - Drop the previous mismatched student RPC signature.
  - Recreate `public.admin_create_student_with_login` with the corrected frontend-compatible signature.
  - Grant execute to `authenticated`.
  - Run `notify pgrst, 'reload schema';`.
- Added `20260608124500_admin_create_student_login_rpc_hotfix.sql` as the immediate self-contained fix:
  - Creates `provision_student_login_with_password` if the earlier provisioning migration did not apply.
  - Drops previous student RPC overloads.
  - Recreates `admin_create_student_with_login` with the exact schema-cache argument list.
  - Uses internal casts for `target_dob` and `target_section_id`.
  - Grants execute and reloads PostgREST schema cache.

## Remote Database Execution

- Linked the local Supabase project to remote project `dgrtixahrbesogmtwxai`.
- Executed the hotfix directly against the linked remote database with:

```powershell
supabase db query --linked --file migrations\20260608124500_admin_create_student_login_rpc_hotfix.sql --workdir backend\supabase
```

- Verified the remote database now has:

```sql
public.admin_create_student_with_login(
  target_address text,
  target_category_id text,
  target_contact text,
  target_dob text,
  target_email text,
  target_gender text,
  target_name text,
  target_parent_contact text,
  target_parent_name text,
  target_password text,
  target_roll_no text,
  target_section_id text
)
```

- A direct REST check could not be completed because the `backend/.env` service key returned `Invalid API key`, but the SQL catalog verification through Supabase CLI succeeded.

## Password Visibility UI Change

- Added eye / eye-off buttons for:
  - Student login password
  - Confirm password
- Password fields are hidden by default.
- Each toggle switches only its own input between `password` and `text`.
- Toggle state resets when the form is closed or after successful submission.

## Security Notes

- Password is not logged.
- Password is not displayed after submission.
- Password is not stored in `students`, `profiles`, or frontend state beyond temporary form/toggle handling.
- Frontend sends password only to the admin-safe RPC.
- No service-role key was added or exposed to frontend.
- No broad `using (true)` RLS policies were added.
- RPC keeps the existing admin-check pattern: `public.current_profile_role() = 'Admin'`.

## Lint Result

- `cd frontend && npm run lint`: Passed.

## Build Result

- `cd frontend && npm run build`: Passed.

## Manual Test Steps

1. Login as Admin.
2. Open Student Registry.
3. Click Add Student.
4. Enter student details, DOB, level, section, password, and confirm password.
5. Click the eye icon on password and confirm password; each should reveal/hide independently.
6. Submit Create Student Record.
7. Confirm no schema-cache RPC error appears.
8. Confirm the student record is created and linked to a Student profile/auth user.
9. Login with the new student email and the password typed by Admin.
