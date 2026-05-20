drop table if exists temp_missing_teacher_accounts;

create temporary table temp_missing_teacher_accounts as
select
  gen_random_uuid() as user_id,
  t.name,
  t.email
from public.teachers t
left join public.profiles p
  on lower(p.email) = lower(t.email)
left join auth.users u
  on lower(u.email) = lower(t.email)
where t.profile_id is null
  and p.id is null
  and u.id is null;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  tma.user_id,
  'authenticated',
  'authenticated',
  tma.email,
  crypt('Teacher@123', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', tma.name, 'role', 'Teacher', 'email_verified', true),
  timezone('utc', now()),
  timezone('utc', now()),
  false,
  false
from temp_missing_teacher_accounts tma;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  tma.email,
  tma.user_id,
  jsonb_build_object('sub', tma.user_id::text, 'email', tma.email, 'email_verified', true),
  'email',
  null,
  timezone('utc', now()),
  timezone('utc', now())
from temp_missing_teacher_accounts tma;

insert into public.profiles (id, name, email, role)
select
  u.id,
  t.name,
  t.email,
  'Teacher'
from public.teachers t
join auth.users u
  on lower(u.email) = lower(t.email)
left join public.profiles p
  on p.id = u.id
where t.profile_id is null
  and p.id is null;

update public.teachers t
set profile_id = p.id
from public.profiles p
where t.profile_id is null
  and lower(p.email) = lower(t.email);

delete from public.section_teacher_assignments
where role = 'Subject Teacher';

with section_meta as (
  select
    sec.id,
    sec.name,
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
from subject_teacher_rows;

drop table if exists temp_missing_teacher_accounts;
