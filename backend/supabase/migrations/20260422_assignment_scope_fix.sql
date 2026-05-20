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
      and class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = subject
        or subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Student'
      and p.class_name = class_name
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
      and teacher_id = auth.uid()
      and class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = subject
        or subject = any(coalesce(p.subjects, '{}'::text[]))
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
      and teacher_id = auth.uid()
      and class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = subject
        or subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
);
