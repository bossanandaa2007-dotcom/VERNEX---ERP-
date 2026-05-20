drop policy if exists "sections_select_scoped" on public.sections;
drop policy if exists "students_select_scoped" on public.students;

create policy "sections_select_scoped"
on public.sections
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body', 'Student')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.sections.name = any(coalesce(p.classes, '{}'::text[]))
        or public.sections.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "students_select_scoped"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or public.students.profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = public.students.section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);
