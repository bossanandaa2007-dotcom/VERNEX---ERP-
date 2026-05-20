alter table public.teachers
add column if not exists home_section_id uuid references public.sections (id) on delete set null;

create unique index if not exists teachers_home_section_unique_idx
on public.teachers (home_section_id)
where home_section_id is not null;

with ranked_class_teachers as (
  select
    sta.section_id,
    sta.teacher_id,
    row_number() over (partition by sta.section_id order by sta.created_at asc, sta.teacher_id asc) as rn
  from public.section_teacher_assignments sta
  where sta.role = 'Class Teacher'
)
update public.teachers t
set home_section_id = ranked.section_id
from ranked_class_teachers ranked
where ranked.rn = 1
  and ranked.teacher_id = t.id
  and t.home_section_id is null;

with sections_missing_teachers as (
  select
    s.id as section_id,
    s.name as section_name,
    s.category_id,
    split_part(s.name, '-', 1) as standard_label,
    split_part(s.name, '-', 2) as section_letter
  from public.sections s
  left join public.teachers t on t.home_section_id = s.id
  where t.id is null
),
seeded_teachers as (
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
    smt.section_id,
    smt.category_id,
    concat('Class Teacher ', smt.section_name),
    case
      when smt.standard_label in ('LKG', 'UKG') then 'Early Learning'
      when smt.standard_label in ('1', '2', '3', '4', '5') then 'English'
      when smt.standard_label in ('6', '7', '8', '9', '10') then 'English'
      when smt.section_letter = 'A' then 'English'
      when smt.section_letter = 'B' then 'Physics'
      else 'Business'
    end,
    case
      when smt.standard_label in ('LKG', 'UKG') then '{"Early Learning","Art","Rhymes"}'::text[]
      when smt.standard_label in ('1', '2', '3', '4', '5') then '{"Tamil","English","Math","Science","Social"}'::text[]
      when smt.standard_label in ('6', '7', '8', '9', '10') then '{"Tamil","English","Math","Science","Social"}'::text[]
      when smt.section_letter = 'A' then '{"Physics","Chemistry","Math","Computer Science","English","Tamil"}'::text[]
      when smt.section_letter = 'B' then '{"Physics","Chemistry","Math","Botany","Zoology","English","Hindi"}'::text[]
      else '{"Business","Math","Commerce","Economics","Computer Application","English","French"}'::text[]
    end,
    'B.Ed',
    '5 years',
    concat('+91 93', lpad((1000000 + ascii(left(smt.section_name, 1)) * 1000 + ascii(right(smt.section_name, 1)) * 10)::text, 7, '0')),
    concat('class.', lower(replace(smt.section_name, '-', '')), '@school.edu'),
    smt.section_name,
    array[smt.section_name]
  from sections_missing_teachers smt
)
select count(*) from seeded_teachers;

update public.sections s
set class_teacher = t.name
from public.teachers t
where t.home_section_id = s.id;

delete from public.section_teacher_assignments
where role = 'Class Teacher';
