drop policy if exists "assignments_select_scoped" on public.assignments;
drop policy if exists "assignments_manage_teacher_admin" on public.assignments;

create policy "assignments_select_scoped"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and public.assignments.class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = public.assignments.subject
        or public.assignments.subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Student'
      and p.class_name = public.assignments.class_name
  )
);

create policy "assignments_manage_teacher_admin"
on public.assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and public.assignments.teacher_id = auth.uid()
      and public.assignments.class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = public.assignments.subject
        or public.assignments.subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and public.assignments.teacher_id = auth.uid()
      and public.assignments.class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = public.assignments.subject
        or public.assignments.subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
);
