create table if not exists public.section_subjects (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  category_id text not null references public.class_categories (id) on delete cascade,
  subject_name text not null,
  code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id, subject_name)
);

create index if not exists section_subjects_section_idx
on public.section_subjects (section_id, sort_order, subject_name);

alter table public.section_subjects enable row level security;

drop policy if exists "section_subjects_select_authenticated" on public.section_subjects;
drop policy if exists "section_subjects_manage_admin" on public.section_subjects;

create policy "section_subjects_select_authenticated"
on public.section_subjects
for select
to authenticated
using (true);

create policy "section_subjects_manage_admin"
on public.section_subjects
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

delete from public.section_subjects;

with raw_section_subjects as (
  select
    sec.id as section_id,
    sec.category_id,
    public.normalize_subject_name(t.subject) as subject_name
  from public.sections sec
  join public.teachers t on t.home_section_id = sec.id
  where coalesce(trim(t.subject), '') <> ''

  union

  select
    sec.id as section_id,
    sec.category_id,
    public.normalize_subject_name(sta.subject) as subject_name
  from public.sections sec
  join public.section_teacher_assignments sta
    on sta.section_id = sec.id
   and sta.role = 'Subject Teacher'
  where coalesce(trim(sta.subject), '') <> ''
),
deduped_section_subjects as (
  select distinct
    section_id,
    category_id,
    subject_name
  from raw_section_subjects
  where subject_name is not null
),
ranked_section_subjects as (
  select
    dss.section_id,
    dss.category_id,
    dss.subject_name,
    coalesce(catalog.code, upper(left(regexp_replace(dss.subject_name, '[^A-Za-z]', '', 'g'), 4))) as code,
    row_number() over (
      partition by dss.section_id
      order by coalesce(catalog.sort_order, 999), dss.subject_name
    ) - 1 as sort_order
  from deduped_section_subjects dss
  left join public.subjects catalog
    on catalog.category_id = dss.category_id
   and public.normalize_subject_name(catalog.name) = dss.subject_name
)
insert into public.section_subjects (section_id, category_id, subject_name, code, sort_order)
select
  rss.section_id,
  rss.category_id,
  rss.subject_name,
  rss.code,
  rss.sort_order
from ranked_section_subjects rss
order by rss.section_id, rss.sort_order;

delete from public.student_marks sm
where not exists (
  select 1
  from public.sections sec
  join public.section_subjects ss on ss.section_id = sec.id
  where sec.name = sm.class_name
    and ss.subject_name = public.normalize_subject_name(sm.subject_name)
);

update public.student_marks
set subject_name = public.normalize_subject_name(subject_name)
where subject_name is distinct from public.normalize_subject_name(subject_name);
