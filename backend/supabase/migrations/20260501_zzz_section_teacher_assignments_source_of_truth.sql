alter table public.section_teacher_assignments
alter column subject set default 'General';

create unique index if not exists section_one_class_teacher_idx
on public.section_teacher_assignments (section_id)
where role = 'Class Teacher';

insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select
  t.home_section_id,
  t.id,
  t.profile_id,
  'Class Teacher',
  'Class Teacher'
from public.teachers t
where t.home_section_id is not null
on conflict (section_id, teacher_id, role, subject) do nothing;

insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select
  sec.id,
  t.id,
  t.profile_id,
  'Class Teacher',
  'Class Teacher'
from public.sections sec
join public.teachers t on lower(trim(t.name)) = lower(trim(sec.class_teacher))
where coalesce(sec.class_teacher, '') <> ''
  and not exists (
    select 1
    from public.section_teacher_assignments existing
    where existing.section_id = sec.id
      and existing.role = 'Class Teacher'
  )
on conflict (section_id, teacher_id, role, subject) do nothing;

insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select
  sec.id,
  t.id,
  t.profile_id,
  'Subject Teacher',
  coalesce(nullif(t.subject, ''), 'General')
from public.teachers t
cross join lateral unnest(coalesce(t.standards, '{}'::text[])) as assigned_section_name
join public.sections sec on sec.name = assigned_section_name
where not exists (
  select 1
  from public.section_teacher_assignments existing
  where existing.section_id = sec.id
    and existing.teacher_id = t.id
    and existing.role = 'Class Teacher'
)
on conflict (section_id, teacher_id, role, subject) do nothing;

create or replace function public.current_teacher_class_names()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct sec.name) filter (where sec.name is not null and sec.name <> ''), '{}'::text[])
  from public.section_teacher_assignments sta
  join public.sections sec on sec.id = sta.section_id
  where sta.teacher_profile_id = auth.uid()
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
      and sta.role = 'Subject Teacher'
  ) scoped_subjects
$$;

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
    from public.section_teacher_assignments sta
    join public.sections sec on sec.id = sta.section_id
    where sta.teacher_id = public.teachers.id
      and sec.name = any(public.current_teacher_class_names())
  )
);

alter table public.teachers
drop column if exists home_section_id,
drop column if exists assigned_class,
drop column if exists standards;

alter table public.sections
drop column if exists class_teacher;
