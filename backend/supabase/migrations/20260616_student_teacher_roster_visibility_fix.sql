drop policy if exists "section_teacher_assignments_select_scoped" on public.section_teacher_assignments;

create policy "section_teacher_assignments_select_scoped"
on public.section_teacher_assignments
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Governing Body')
  or (
    public.current_profile_role() = 'Teacher'
    and exists (
      select 1
      from public.teachers teacher
      where teacher.id = public.section_teacher_assignments.teacher_id
        and teacher.profile_id = auth.uid()
    )
  )
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.section_id = public.section_teacher_assignments.section_id
  )
);

drop policy if exists "teachers_select_scoped" on public.teachers;

create policy "teachers_select_scoped"
on public.teachers
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.teachers.profile_id = auth.uid()
  or exists (
    select 1
    from public.sections sec
    where sec.id = public.teachers.home_section_id
      and sec.name = any(public.current_teacher_class_names())
  )
  or exists (
    select 1
    from public.section_teacher_assignments assignment
    join public.sections sec on sec.id = assignment.section_id
    where assignment.teacher_id = public.teachers.id
      and sec.name = any(public.current_teacher_class_names())
  )
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.section_id = public.teachers.home_section_id
  )
  or exists (
    select 1
    from public.students student
    join public.section_teacher_assignments assignment on assignment.section_id = student.section_id
    where student.profile_id = auth.uid()
      and assignment.teacher_id = public.teachers.id
  )
);

notify pgrst, 'reload schema';
