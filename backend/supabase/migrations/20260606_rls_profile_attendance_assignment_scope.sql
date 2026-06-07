create or replace function public.teacher_can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() = 'Teacher'
    and (
      target_profile_id = auth.uid()
      or exists (
        select 1
        from public.students s
        join public.sections sec on sec.id = s.section_id
        where s.profile_id = target_profile_id
          and sec.name = any(public.current_teacher_class_names())
      )
    )
$$;

create or replace function public.list_governing_body_recipients()
returns table (
  id uuid,
  name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name
  from public.profiles p
  where p.role = 'Governing Body'
  order by p.name asc, p.id asc
$$;

grant execute on function public.list_governing_body_recipients() to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_scoped" on public.profiles;

create policy "profiles_select_scoped"
on public.profiles
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Governing Body')
  or public.profiles.id = auth.uid()
  or public.teacher_can_read_profile(public.profiles.id)
);

drop policy if exists "attendance_select_authenticated" on public.attendance_records;
drop policy if exists "attendance_select_scoped" on public.attendance_records;

create policy "attendance_select_scoped"
on public.attendance_records
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Governing Body')
  or (
    public.current_profile_role() = 'Teacher'
    and public.attendance_records.class_id = any(public.current_teacher_class_names())
  )
  or (
    public.current_profile_role() = 'Student'
    and exists (
      select 1
      from public.students s
      where s.profile_id = auth.uid()
        and s.id::text = public.attendance_records.student_id
    )
  )
);

drop policy if exists "section_teacher_assignments_select_authenticated" on public.section_teacher_assignments;
drop policy if exists "section_teacher_assignments_select_scoped" on public.section_teacher_assignments;

create policy "section_teacher_assignments_select_scoped"
on public.section_teacher_assignments
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Governing Body')
  or (
    public.current_profile_role() = 'Teacher'
    and public.section_teacher_assignments.teacher_profile_id = auth.uid()
  )
);
