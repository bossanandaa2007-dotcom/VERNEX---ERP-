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
  or (
    public.current_profile_role() = 'Student'
    and exists (
      select 1
      from public.students student
      where student.profile_id = auth.uid()
        and student.section_id = public.section_teacher_assignments.section_id
    )
  )
);

notify pgrst, 'reload schema';
