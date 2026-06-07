-- Rollback for 20260606_rls_profile_attendance_assignment_scope.sql
-- Restores the previous broad authenticated select policies.
-- Note: list_governing_body_recipients() is kept because the current frontend
-- uses it for complaint recipient routing. Dropping it would break the app
-- unless the frontend is rolled back at the same time.

drop policy if exists "profiles_select_scoped" on public.profiles;
drop policy if exists "attendance_select_scoped" on public.attendance_records;
drop policy if exists "section_teacher_assignments_select_scoped" on public.section_teacher_assignments;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "attendance_select_authenticated" on public.attendance_records;
create policy "attendance_select_authenticated"
on public.attendance_records
for select
to authenticated
using (true);

drop policy if exists "section_teacher_assignments_select_authenticated" on public.section_teacher_assignments;
create policy "section_teacher_assignments_select_authenticated"
on public.section_teacher_assignments
for select
to authenticated
using (true);

drop function if exists public.teacher_can_read_profile(uuid);
