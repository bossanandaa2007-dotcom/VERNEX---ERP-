create or replace function public.current_teacher_home_class_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sec.name
  from public.teachers t
  join public.sections sec on sec.id = t.home_section_id
  where t.profile_id = auth.uid()
  limit 1
$$;

create or replace function public.teacher_owns_attendance_class(target_class_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teachers t
    join public.sections sec on sec.id = t.home_section_id
    where t.profile_id = auth.uid()
      and sec.name = target_class_name
  )
$$;

create or replace function public.teacher_handles_class_subject(target_section_id uuid, target_class_name text, target_subject_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select
        sta.section_id,
        sec.name as class_name,
        sta.subject
      from public.section_teacher_assignments sta
      join public.sections sec on sec.id = sta.section_id
      where sta.teacher_profile_id = auth.uid()
        and sta.role = 'Subject Teacher'

      union all

      select
        t.home_section_id as section_id,
        home_sec.name as class_name,
        teacher_subjects.subject_name as subject
      from public.teachers t
      join public.sections home_sec on home_sec.id = t.home_section_id
      cross join lateral (
        select unnest(
          case
            when coalesce(array_length(t.subjects, 1), 0) > 0 then t.subjects
            when coalesce(t.subject, '') <> '' then array[t.subject]
            else '{}'::text[]
          end
        ) as subject_name
      ) teacher_subjects
      where t.profile_id = auth.uid()
    ) teacher_scope
    where teacher_scope.section_id = target_section_id
      and teacher_scope.class_name = target_class_name
      and lower(trim(teacher_scope.subject)) = lower(trim(target_subject_name))
  )
$$;

drop policy if exists "attendance_insert_teacher_only" on public.attendance_records;
drop policy if exists "attendance_update_teacher_only" on public.attendance_records;
drop policy if exists "attendance_insert_teacher_admin" on public.attendance_records;
drop policy if exists "attendance_update_teacher_admin" on public.attendance_records;
drop policy if exists "attendance_insert_home_class_teacher" on public.attendance_records;
drop policy if exists "attendance_update_home_class_teacher" on public.attendance_records;

create policy "attendance_insert_home_class_teacher"
on public.attendance_records
for insert
to authenticated
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(class_id)
  )
);

create policy "attendance_update_home_class_teacher"
on public.attendance_records
for update
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(public.attendance_records.class_id)
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(class_id)
  )
);

drop policy if exists "student_marks_insert_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_update_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_delete_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_insert_exact_subject_teacher" on public.student_marks;
drop policy if exists "student_marks_update_exact_subject_teacher" on public.student_marks;
drop policy if exists "student_marks_delete_exact_subject_teacher" on public.student_marks;

create policy "student_marks_insert_exact_subject_teacher"
on public.student_marks
for insert
to authenticated
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(section_id, class_name, subject_name)
  )
);

create policy "student_marks_update_exact_subject_teacher"
on public.student_marks
for update
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(public.student_marks.section_id, public.student_marks.class_name, public.student_marks.subject_name)
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(section_id, class_name, subject_name)
  )
);

create policy "student_marks_delete_exact_subject_teacher"
on public.student_marks
for delete
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(public.student_marks.section_id, public.student_marks.class_name, public.student_marks.subject_name)
  )
);
