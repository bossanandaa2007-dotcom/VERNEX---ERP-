alter table public.teachers
add column if not exists home_section_id uuid references public.sections (id) on delete set null;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.current_teacher_class_names()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct class_name) filter (where class_name is not null and class_name <> ''), '{}'::text[])
  from (
    select t.assigned_class as class_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select unnest(coalesce(t.standards, '{}'::text[])) as class_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select s.name as class_name
    from public.teachers t
    join public.sections s on s.id = t.home_section_id
    where t.profile_id = auth.uid()

    union

    select s.name as class_name
    from public.section_teacher_assignments sta
    join public.sections s on s.id = sta.section_id
    where sta.teacher_profile_id = auth.uid()
  ) scoped_classes
$$;

create or replace function public.current_teacher_subject_names()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct subject_name) filter (where subject_name is not null and subject_name <> ''), '{}'::text[])
  from (
    select t.subject as subject_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select unnest(coalesce(t.subjects, '{}'::text[])) as subject_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select sta.subject as subject_name
    from public.section_teacher_assignments sta
    where sta.teacher_profile_id = auth.uid()
  ) scoped_subjects
$$;

create or replace function public.current_student_class_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sec.name
  from public.students s
  join public.sections sec on sec.id = s.section_id
  where s.profile_id = auth.uid()
  limit 1
$$;

drop policy if exists "sections_select_authenticated" on public.sections;
drop policy if exists "teachers_select_authenticated" on public.teachers;
drop policy if exists "students_select_authenticated" on public.students;
drop policy if exists "school_directory_manage_admin" on public.sections;
drop policy if exists "sections_select_scoped" on public.sections;
drop policy if exists "teachers_select_scoped" on public.teachers;
drop policy if exists "students_select_scoped" on public.students;
drop policy if exists "sections_manage_admin" on public.sections;
drop policy if exists "sections_update_teacher_scope" on public.sections;
drop policy if exists "teachers_manage_admin" on public.teachers;
drop policy if exists "students_manage_admin" on public.students;
drop policy if exists "students_insert_teacher_scope" on public.students;
drop policy if exists "students_update_teacher_scope" on public.students;
drop policy if exists "students_delete_teacher_scope" on public.students;

create policy "sections_select_scoped"
on public.sections
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.sections.name = public.current_student_class_name()
  or public.sections.name = any(public.current_teacher_class_names())
);

create policy "teachers_select_scoped"
on public.teachers
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.teachers.profile_id = auth.uid()
  or public.teachers.assigned_class = any(public.current_teacher_class_names())
  or public.teachers.standards && public.current_teacher_class_names()
  or exists (
    select 1
    from public.sections sec
    where sec.id = public.teachers.home_section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);

create policy "students_select_scoped"
on public.students
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.students.profile_id = auth.uid()
  or exists (
    select 1
    from public.sections sec
    where sec.id = public.students.section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);

create policy "sections_manage_admin"
on public.sections
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

create policy "sections_update_teacher_scope"
on public.sections
for update
to authenticated
using (public.sections.name = any(public.current_teacher_class_names()))
with check (public.sections.name = any(public.current_teacher_class_names()));

create policy "teachers_manage_admin"
on public.teachers
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

create policy "students_manage_admin"
on public.students
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

create policy "students_insert_teacher_scope"
on public.students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sections sec
    where sec.id = section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);

create policy "students_update_teacher_scope"
on public.students
for update
to authenticated
using (
  exists (
    select 1
    from public.sections sec
    where sec.id = public.students.section_id
      and sec.name = any(public.current_teacher_class_names())
  )
)
with check (
  exists (
    select 1
    from public.sections sec
    where sec.id = section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);

create policy "students_delete_teacher_scope"
on public.students
for delete
to authenticated
using (
  exists (
    select 1
    from public.sections sec
    where sec.id = public.students.section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);

drop policy if exists "assignments_select_authenticated" on public.assignments;
drop policy if exists "assignments_select_scoped" on public.assignments;
drop policy if exists "assignments_manage_teacher_admin" on public.assignments;
drop policy if exists "study_materials_select_authenticated" on public.study_materials;
drop policy if exists "study_materials_select_scoped" on public.study_materials;
drop policy if exists "study_materials_manage_teacher_admin" on public.study_materials;

create policy "assignments_select_scoped"
on public.assignments
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.assignments.class_name = public.current_student_class_name()
  or public.assignments.class_name = any(public.current_teacher_class_names())
);

create policy "assignments_manage_teacher_admin"
on public.assignments
for all
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.assignments.class_name = any(public.current_teacher_class_names())
    and public.assignments.subject = any(public.current_teacher_subject_names())
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    class_name = any(public.current_teacher_class_names())
    and subject = any(public.current_teacher_subject_names())
  )
);

create policy "study_materials_select_scoped"
on public.study_materials
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.study_materials.class_name = public.current_student_class_name()
  or public.study_materials.class_name = any(public.current_teacher_class_names())
);

create policy "study_materials_manage_teacher_admin"
on public.study_materials
for all
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.study_materials.class_name = any(public.current_teacher_class_names())
    and public.study_materials.subject = any(public.current_teacher_subject_names())
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    class_name = any(public.current_teacher_class_names())
    and subject = any(public.current_teacher_subject_names())
  )
);

drop policy if exists "student_marks_select_scoped" on public.student_marks;
drop policy if exists "student_marks_insert_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_update_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_delete_teacher_admin" on public.student_marks;

create policy "student_marks_select_scoped"
on public.student_marks
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.student_marks.class_name = any(public.current_teacher_class_names())
  or exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.id = public.student_marks.student_id
  )
);

create policy "student_marks_insert_teacher_admin"
on public.student_marks
for insert
to authenticated
with check (
  public.current_profile_role() = 'Admin'
  or (
    class_name = any(public.current_teacher_class_names())
    and subject_name = any(public.current_teacher_subject_names())
  )
);

create policy "student_marks_update_teacher_admin"
on public.student_marks
for update
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.student_marks.class_name = any(public.current_teacher_class_names())
    and public.student_marks.subject_name = any(public.current_teacher_subject_names())
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    class_name = any(public.current_teacher_class_names())
    and subject_name = any(public.current_teacher_subject_names())
  )
);

create policy "student_marks_delete_teacher_admin"
on public.student_marks
for delete
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.student_marks.class_name = any(public.current_teacher_class_names())
    and public.student_marks.subject_name = any(public.current_teacher_subject_names())
  )
);

drop policy if exists "leave_requests_insert_student" on public.leave_requests;

create policy "leave_requests_insert_student"
on public.leave_requests
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
  and class_name = public.current_student_class_name()
  and exists (
    select 1
    from public.profiles recipient_profile
    where recipient_profile.id = teacher_profile_id
      and recipient_profile.role in ('Teacher', 'Governing Body')
  )
);

drop policy if exists "assignment_submissions_insert_authenticated" on public.assignment_submissions;
drop policy if exists "assignment_submissions_insert_student" on public.assignment_submissions;

create policy "assignment_submissions_insert_student"
on public.assignment_submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_id
      and public.current_profile_role() = 'Student'
      and public.current_student_class_name() = a.class_name
  )
);

alter table public.profiles
drop column if exists standard,
drop column if exists class_name,
drop column if exists section,
drop column if exists standards,
drop column if exists classes,
drop column if exists subject,
drop column if exists subjects;
