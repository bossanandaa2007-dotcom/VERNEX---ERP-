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
    from public.section_teacher_assignments sta
    join public.sections sec on sec.id = sta.section_id
    where sta.teacher_id = public.teachers.id
      and sec.name = any(public.current_teacher_class_names())
  )
  or exists (
    select 1
    from public.students st
    where st.profile_id = auth.uid()
      and st.section_id = public.teachers.home_section_id
  )
  or exists (
    select 1
    from public.students st
    join public.section_teacher_assignments sta on sta.section_id = st.section_id
    where st.profile_id = auth.uid()
      and sta.teacher_id = public.teachers.id
  )
);
