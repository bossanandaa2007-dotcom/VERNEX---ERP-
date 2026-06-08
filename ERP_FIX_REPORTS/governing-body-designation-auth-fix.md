# Governing Body Designation/Auth Fix

## Files Changed
- `frontend/src/services/auth.ts`
- `frontend/src/modules/dashboard/Governing.tsx`
- `frontend/src/services/recipientRouting.ts`
- `backend/supabase/migrations/20260608_governing_body_designation_separation.sql`

## Database/Migration Changes
- Added `designation` to `public.profiles` if it does not already exist.
- Normalized any legacy governing-body designation stored in `profiles.role` back to role `Governing Body`, while preserving the old value in `profiles.designation`.
- Synced governing-body designation values into `public.user_profiles.designation` without changing non-governing roles.
- Updated `public.list_governing_body_recipients()` to return `id`, `name`, and `designation`.
- No broad RLS policies were added. No `using (true)` policy was added.

## Exact Issue Found
- Auth already normalized role-like values such as `Principal`, `HM`, and `Vice Principal` into the main `governing_body` role, but designation fallback was incomplete.
- `user_profiles.designation` could contain the placeholder `Governing Body`, causing the UI to show all governing users the same way even when a real designation existed elsewhere.
- Legacy `profiles` reads did not include `designation`, so a designation stored on the legacy profile row was invisible to the login/profile flow.
- The governing dashboard showed a generic `Management access` label instead of the logged-in governing user identity.

## Fix Implemented
- Kept the auth role as `Governing Body` by continuing to route through `mainRole = governing_body`.
- Added designation fallback order for governing users:
  1. `user_profiles.designation`
  2. `profiles.designation`
  3. legacy role value if it was previously used as a designation
  4. Supabase auth metadata designation fields
  5. `Governing Body` fallback
- Treated stored `Governing Body` designation as a placeholder, not as the real designation.
- Updated the governing dashboard header area to show:
  - user name
  - designation
  - role `Governing Body`
- Updated governing complaint recipients to include designation in the recipient label when available.

## Role and Designation Separation
- Role remains the authorization value: `Governing Body`.
- Designation is now read separately from `designation`.
- Designation is never used as the dashboard route key.
- Login routing still uses normalized main role, so `Principal`, `Vice Principal`, `HM`, and similar governing designations resolve to `/governing/dashboard`, not `/teacher/dashboard`.

## Test Result
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.

## Manual/Code Verification
- Admin-created governing profile data can now store:
  - role: `Governing Body`
  - designation: `Principal`, `Vice Principal`, `HM`, `Correspondent`, etc.
- Governing users still route to `/governing/dashboard`.
- Header/profile/dashboard display role and designation separately.
- Complaint inbox remains filtered by logged-in `targetId: user.id`.
- Existing Admin, Teacher, Student, Librarian, and Accountant routing was not changed.

## Remaining Caveat
- This repository does not contain a dedicated Admin user-account creation screen for arbitrary roles. The fix supports the role/designation data path and display, and the migration supports correct storage, but any external/Admin account creation process must write `role = 'Governing Body'` and `designation = '<actual designation>'`.
