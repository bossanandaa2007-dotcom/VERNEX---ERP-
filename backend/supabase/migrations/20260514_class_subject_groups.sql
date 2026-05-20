create table if not exists public.class_subject_groups (
  id text primary key,
  category_id text not null references public.class_categories (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.class_subject_group_subjects (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.class_subject_groups (id) on delete cascade,
  category_id text not null references public.class_categories (id) on delete cascade,
  subject_name text not null,
  code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (group_id, subject_name)
);

create table if not exists public.class_subject_group_sections (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.class_subject_groups (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id),
  unique (group_id, section_id)
);

create index if not exists class_subject_group_subjects_group_idx
on public.class_subject_group_subjects (group_id, sort_order, subject_name);

create index if not exists class_subject_group_sections_group_idx
on public.class_subject_group_sections (group_id, section_id);

alter table public.class_subject_groups enable row level security;
alter table public.class_subject_group_subjects enable row level security;
alter table public.class_subject_group_sections enable row level security;

drop policy if exists "class_subject_groups_select_authenticated" on public.class_subject_groups;
drop policy if exists "class_subject_groups_manage_admin" on public.class_subject_groups;
drop policy if exists "class_subject_group_subjects_select_authenticated" on public.class_subject_group_subjects;
drop policy if exists "class_subject_group_subjects_manage_admin" on public.class_subject_group_subjects;
drop policy if exists "class_subject_group_sections_select_authenticated" on public.class_subject_group_sections;
drop policy if exists "class_subject_group_sections_manage_admin" on public.class_subject_group_sections;

create policy "class_subject_groups_select_authenticated"
on public.class_subject_groups
for select
to authenticated
using (true);

create policy "class_subject_groups_manage_admin"
on public.class_subject_groups
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

create policy "class_subject_group_subjects_select_authenticated"
on public.class_subject_group_subjects
for select
to authenticated
using (true);

create policy "class_subject_group_subjects_manage_admin"
on public.class_subject_group_subjects
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

create policy "class_subject_group_sections_select_authenticated"
on public.class_subject_group_sections
for select
to authenticated
using (true);

create policy "class_subject_group_sections_manage_admin"
on public.class_subject_group_sections
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');

alter table public.section_subjects
add column if not exists source_group_id text references public.class_subject_groups (id) on delete set null;

create or replace function public.default_subject_group_id_for_section(section_name text, section_category_id text)
returns text
language sql
immutable
as $$
  select case
    when section_category_id = 'kindergarten' then 'kindergarten-core'
    when section_category_id = 'primary' then 'primary-core'
    when section_category_id = 'secondary' then 'secondary-core'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '11-a' then 'higher-secondary-11-a'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '11-b' then 'higher-secondary-11-b'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '11-c' then 'higher-secondary-11-c'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '12-a' then 'higher-secondary-12-a'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '12-b' then 'higher-secondary-12-b'
    when section_category_id = 'higher-secondary' and lower(trim(section_name)) = '12-c' then 'higher-secondary-12-c'
    else null
  end;
$$;

create or replace function public.refresh_section_subjects_from_group_assignments(target_section_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_section_id is null then
    delete from public.section_subjects;

    insert into public.section_subjects (section_id, category_id, subject_name, code, sort_order, source_group_id)
    select
      mapping.section_id,
      grp.category_id,
      public.normalize_subject_name(subject_row.subject_name),
      subject_row.code,
      subject_row.sort_order,
      mapping.group_id
    from public.class_subject_group_sections mapping
    join public.class_subject_groups grp on grp.id = mapping.group_id
    join public.class_subject_group_subjects subject_row on subject_row.group_id = mapping.group_id
    order by mapping.section_id, subject_row.sort_order, subject_row.subject_name;
  else
    delete from public.section_subjects
    where section_id = target_section_id;

    insert into public.section_subjects (section_id, category_id, subject_name, code, sort_order, source_group_id)
    select
      mapping.section_id,
      grp.category_id,
      public.normalize_subject_name(subject_row.subject_name),
      subject_row.code,
      subject_row.sort_order,
      mapping.group_id
    from public.class_subject_group_sections mapping
    join public.class_subject_groups grp on grp.id = mapping.group_id
    join public.class_subject_group_subjects subject_row on subject_row.group_id = mapping.group_id
    where mapping.section_id = target_section_id
    order by mapping.section_id, subject_row.sort_order, subject_row.subject_name;
  end if;

  delete from public.student_marks sm
  where (target_section_id is null or sm.section_id = target_section_id)
    and not exists (
      select 1
      from public.section_subjects ss
      where ss.section_id = sm.section_id
        and lower(trim(ss.subject_name)) = lower(trim(sm.subject_name))
    );

  update public.student_marks sm
  set subject_name = public.normalize_subject_name(sm.subject_name)
  where (target_section_id is null or sm.section_id = target_section_id)
    and sm.subject_name is distinct from public.normalize_subject_name(sm.subject_name);
end;
$$;

create or replace function public.sync_section_subjects_after_group_section_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_section_subjects_from_group_assignments(coalesce(new.section_id, old.section_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_section_subjects_after_group_subject_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id text;
begin
  target_group_id := coalesce(new.group_id, old.group_id);

  perform public.refresh_section_subjects_from_group_assignments(mapping.section_id)
  from public.class_subject_group_sections mapping
  where mapping.group_id = target_group_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists class_subject_group_sections_refresh_section_subjects on public.class_subject_group_sections;
create trigger class_subject_group_sections_refresh_section_subjects
after insert or update or delete on public.class_subject_group_sections
for each row execute function public.sync_section_subjects_after_group_section_change();

drop trigger if exists class_subject_group_subjects_refresh_section_subjects on public.class_subject_group_subjects;
create trigger class_subject_group_subjects_refresh_section_subjects
after insert or update or delete on public.class_subject_group_subjects
for each row execute function public.sync_section_subjects_after_group_subject_change();

create or replace function public.auto_assign_subject_group_to_section()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id text;
begin
  target_group_id := public.default_subject_group_id_for_section(new.name, new.category_id);

  if target_group_id is not null then
    insert into public.class_subject_group_sections (group_id, section_id)
    values (target_group_id, new.id)
    on conflict (section_id) do update
      set group_id = excluded.group_id;

    perform public.refresh_section_subjects_from_group_assignments(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists sections_auto_assign_subject_group on public.sections;
create trigger sections_auto_assign_subject_group
after insert or update of name, category_id on public.sections
for each row execute function public.auto_assign_subject_group_to_section();

insert into public.class_subject_groups (id, category_id, name, description)
values
  ('kindergarten-core', 'kindergarten', 'LKG & UKG Core', 'Shared curriculum for all LKG and UKG sections.'),
  ('primary-core', 'primary', 'Classes 1 to 5 Core', 'Shared curriculum for every section from 1st to 5th standard.'),
  ('secondary-core', 'secondary', 'Classes 6 to 10 Core', 'Shared curriculum for every section from 6th to 10th standard.'),
  ('higher-secondary-11-a', 'higher-secondary', '11-A Science Maths', 'Higher secondary curriculum for 11-A.'),
  ('higher-secondary-11-b', 'higher-secondary', '11-B Biology', 'Higher secondary curriculum for 11-B.'),
  ('higher-secondary-11-c', 'higher-secondary', '11-C Commerce', 'Higher secondary curriculum for 11-C.'),
  ('higher-secondary-12-a', 'higher-secondary', '12-A Science Maths', 'Higher secondary curriculum for 12-A.'),
  ('higher-secondary-12-b', 'higher-secondary', '12-B Biology', 'Higher secondary curriculum for 12-B.'),
  ('higher-secondary-12-c', 'higher-secondary', '12-C Commerce', 'Higher secondary curriculum for 12-C.')
on conflict (id) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description;

delete from public.class_subject_group_subjects;

insert into public.class_subject_group_subjects (group_id, category_id, subject_name, code, sort_order)
values
  ('kindergarten-core', 'kindergarten', 'Early Learning', 'ELRN', 0),
  ('kindergarten-core', 'kindergarten', 'Art', 'ART', 1),
  ('kindergarten-core', 'kindergarten', 'Rhymes', 'RHYM', 2),
  ('kindergarten-core', 'kindergarten', 'Storytelling', 'STOR', 3),

  ('primary-core', 'primary', 'Tamil', 'TAM', 0),
  ('primary-core', 'primary', 'English', 'ENG', 1),
  ('primary-core', 'primary', 'Mathematics', 'MATH', 2),
  ('primary-core', 'primary', 'Science', 'SCI', 3),
  ('primary-core', 'primary', 'Primary Studies', 'PSTD', 4),

  ('secondary-core', 'secondary', 'Tamil', 'TAM', 0),
  ('secondary-core', 'secondary', 'English', 'ENG', 1),
  ('secondary-core', 'secondary', 'Mathematics', 'MATH', 2),
  ('secondary-core', 'secondary', 'Science', 'SCI', 3),

  ('higher-secondary-11-a', 'higher-secondary', 'Mathematics', 'MATH', 0),
  ('higher-secondary-11-a', 'higher-secondary', 'Physics', 'PHYS', 1),
  ('higher-secondary-11-a', 'higher-secondary', 'Chemistry', 'CHEM', 2),
  ('higher-secondary-11-a', 'higher-secondary', 'Computer Science', 'CS', 3),
  ('higher-secondary-11-a', 'higher-secondary', 'Academic Mentor', 'MENT', 4),

  ('higher-secondary-11-b', 'higher-secondary', 'Physics', 'PHYS', 0),
  ('higher-secondary-11-b', 'higher-secondary', 'Chemistry', 'CHEM', 1),
  ('higher-secondary-11-b', 'higher-secondary', 'Botany', 'BOT', 2),
  ('higher-secondary-11-b', 'higher-secondary', 'Zoology', 'ZOO', 3),
  ('higher-secondary-11-b', 'higher-secondary', 'Academic Mentor', 'MENT', 4),

  ('higher-secondary-11-c', 'higher-secondary', 'Commerce', 'COMM', 0),
  ('higher-secondary-11-c', 'higher-secondary', 'Economics', 'ECO', 1),
  ('higher-secondary-11-c', 'higher-secondary', 'Business', 'BUS', 2),
  ('higher-secondary-11-c', 'higher-secondary', 'Computer Application', 'CA', 3),
  ('higher-secondary-11-c', 'higher-secondary', 'Academic Mentor', 'MENT', 4),

  ('higher-secondary-12-a', 'higher-secondary', 'Mathematics', 'MATH', 0),
  ('higher-secondary-12-a', 'higher-secondary', 'Physics', 'PHYS', 1),
  ('higher-secondary-12-a', 'higher-secondary', 'Chemistry', 'CHEM', 2),
  ('higher-secondary-12-a', 'higher-secondary', 'Computer Science', 'CS', 3),

  ('higher-secondary-12-b', 'higher-secondary', 'Physics', 'PHYS', 0),
  ('higher-secondary-12-b', 'higher-secondary', 'Chemistry', 'CHEM', 1),
  ('higher-secondary-12-b', 'higher-secondary', 'Botany', 'BOT', 2),
  ('higher-secondary-12-b', 'higher-secondary', 'Zoology', 'ZOO', 3),

  ('higher-secondary-12-c', 'higher-secondary', 'Commerce', 'COMM', 0),
  ('higher-secondary-12-c', 'higher-secondary', 'Economics', 'ECO', 1),
  ('higher-secondary-12-c', 'higher-secondary', 'Business', 'BUS', 2),
  ('higher-secondary-12-c', 'higher-secondary', 'Computer Science', 'CS', 3),
  ('higher-secondary-12-c', 'higher-secondary', 'Computer Application', 'CA', 4);

delete from public.class_subject_group_sections;

insert into public.class_subject_group_sections (group_id, section_id)
select public.default_subject_group_id_for_section(sec.name, sec.category_id), sec.id
from public.sections sec
where public.default_subject_group_id_for_section(sec.name, sec.category_id) is not null;

select public.refresh_section_subjects_from_group_assignments();
