drop policy if exists "sections_select_scoped" on public.sections;
create policy "sections_select_scoped"
on public.sections
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body', 'Librarian')
  or public.sections.name = public.current_student_class_name()
  or public.sections.name = any(public.current_teacher_class_names())
);

drop policy if exists "students_select_scoped" on public.students;
create policy "students_select_scoped"
on public.students
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body', 'Librarian')
  or public.students.profile_id = auth.uid()
  or exists (
    select 1
    from public.sections sec
    where sec.id = public.students.section_id
      and sec.name = any(public.current_teacher_class_names())
  )
);
