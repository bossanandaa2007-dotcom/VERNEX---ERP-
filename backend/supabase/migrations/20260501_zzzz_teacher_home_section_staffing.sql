alter table public.teachers
add column if not exists home_section_id uuid references public.sections (id) on delete set null;

alter table public.teachers
add column if not exists assigned_class text;

alter table public.teachers
add column if not exists standards text[] not null default '{}';

drop index if exists section_one_class_teacher_idx;

create unique index if not exists teachers_home_section_unique_idx
on public.teachers (home_section_id)
where home_section_id is not null;

with ranked_class_assignments as (
  select
    sta.teacher_id,
    sta.section_id,
    row_number() over (partition by sta.section_id order by sta.created_at asc, sta.teacher_id asc) as rn
  from public.section_teacher_assignments sta
  where sta.role = 'Class Teacher'
),
available_class_assignments as (
  select
    rca.teacher_id,
    rca.section_id,
    row_number() over (partition by rca.teacher_id order by rca.section_id) as teacher_rn
  from ranked_class_assignments rca
  where rca.rn = 1
)
update public.teachers t
set
  home_section_id = aca.section_id,
  assigned_class = sec.name
from available_class_assignments aca
join public.sections sec on sec.id = aca.section_id
where aca.teacher_rn = 1
  and t.id = aca.teacher_id
  and t.home_section_id is null;

with missing_home_sections as (
  select
    sec.id as section_id,
    sec.name as section_name,
    sec.category_id,
    row_number() over (order by sec.name) as staff_no,
    split_part(sec.name, '-', 1) as standard_label
  from public.sections sec
  left join public.teachers class_teacher on class_teacher.home_section_id = sec.id
  where class_teacher.id is null
),
seeded_class_teachers as (
  insert into public.teachers (
    profile_id,
    home_section_id,
    category_id,
    name,
    subject,
    subjects,
    qualification,
    experience,
    contact,
    email,
    assigned_class,
    standards
  )
  select
    null,
    mhs.section_id,
    mhs.category_id,
    'Class Teacher ' || mhs.section_name,
    case
      when mhs.standard_label in ('LKG', 'UKG') then 'Early Learning'
      when mhs.standard_label in ('1', '2', '3', '4', '5') then 'Primary Studies'
      when mhs.standard_label in ('6', '7', '8', '9', '10') then 'English'
      when mhs.standard_label in ('11', '12') then 'Academic Mentor'
      else 'General'
    end,
    case
      when mhs.standard_label in ('LKG', 'UKG') then array['Early Learning', 'Art', 'Rhymes']
      when mhs.standard_label in ('1', '2', '3', '4', '5') then array['Tamil', 'English', 'Math', 'Science', 'Social']
      when mhs.standard_label in ('6', '7', '8', '9', '10') then array['Tamil', 'English', 'Math', 'Science', 'Social']
      when mhs.standard_label in ('11', '12') then array['English', 'Math', 'Physics', 'Chemistry', 'Commerce', 'Computer Science']
      else array['General']
    end,
    'B.Ed',
    (4 + (mhs.staff_no % 9))::text || ' years',
    '+91 93' || lpad((20000000 + mhs.staff_no)::text, 8, '0'),
    'class.teacher.' || lower(replace(mhs.section_name, '-', '')) || '@school.edu',
    mhs.section_name,
    array[mhs.section_name]
  from missing_home_sections mhs
  on conflict (email) do update set
    home_section_id = excluded.home_section_id,
    category_id = excluded.category_id,
    name = excluded.name,
    subject = excluded.subject,
    subjects = excluded.subjects,
    qualification = excluded.qualification,
    experience = excluded.experience,
    contact = excluded.contact,
    assigned_class = excluded.assigned_class,
    standards = excluded.standards
  returning id
)
select count(*) from seeded_class_teachers;

update public.teachers t
set
  assigned_class = sec.name,
  standards = array[sec.name]
from public.sections sec
where t.home_section_id = sec.id;

delete from public.section_teacher_assignments
where role = 'Class Teacher';

delete from public.section_teacher_assignments
where role = 'Subject Teacher';

with section_meta as (
  select
    sec.id,
    sec.name,
    sec.category_id,
    row_number() over (order by sec.name) as section_no,
    split_part(sec.name, '-', 1) as standard_label,
    split_part(sec.name, '-', 2) as section_letter
  from public.sections sec
),
subject_slots as (
  select
    sm.id as section_id,
    sm.section_no,
    subject_name,
    slot_no
  from section_meta sm
  cross join lateral (
    select *
    from unnest(
      case
        when sm.standard_label in ('LKG', 'UKG') then array['Early Learning', 'Art', 'Rhymes', 'Storytelling']
        when sm.standard_label in ('1', '2', '3', '4', '5') then array['Tamil', 'English', 'Math', 'Science']
        when sm.standard_label in ('6', '7', '8', '9', '10') then array['Tamil', 'English', 'Math', 'Science']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'A' then array['Physics', 'Chemistry', 'Math', 'Computer Science']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'B' then array['Physics', 'Chemistry', 'Botany', 'Zoology']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'C' then array['Commerce', 'Economics', 'Business', 'Computer Application']
        else array['English', 'Math', 'Science', 'Social']
      end
    ) with ordinality as subjects(subject_name, slot_no)
  ) subjects
),
class_teacher_pool as (
  select
    t.id as teacher_id,
    t.profile_id,
    t.home_section_id,
    row_number() over (order by sec.name) as teacher_no,
    count(*) over () as teacher_count
  from public.teachers t
  join public.sections sec on sec.id = t.home_section_id
),
subject_teacher_rows as (
  select
    ss.section_id,
    pool.teacher_id,
    pool.profile_id as teacher_profile_id,
    'Subject Teacher'::text as role,
    ss.subject_name as subject
  from subject_slots ss
  join lateral (
    select ctp.*
    from class_teacher_pool ctp
    where ctp.home_section_id <> ss.section_id
    order by ((ctp.teacher_no - (ss.section_no + ss.slot_no)) % greatest(ctp.teacher_count, 1) + greatest(ctp.teacher_count, 1)) % greatest(ctp.teacher_count, 1)
    limit 1
  ) pool on true
)
insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select section_id, teacher_id, teacher_profile_id, role, subject
from subject_teacher_rows
on conflict (section_id, teacher_id, role, subject) do nothing;

create or replace function public.current_teacher_class_names()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct class_name) filter (where class_name is not null and class_name <> ''), '{}'::text[])
  from (
    select sec.name as class_name
    from public.teachers t
    join public.sections sec on sec.id = t.home_section_id
    where t.profile_id = auth.uid()

    union

    select sec.name as class_name
    from public.section_teacher_assignments sta
    join public.sections sec on sec.id = sta.section_id
    where sta.teacher_profile_id = auth.uid()
      and sta.role = 'Subject Teacher'
  ) scoped_classes
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
);
