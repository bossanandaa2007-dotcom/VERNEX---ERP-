drop table if exists temp_missing_teacher_logins;
drop table if exists temp_missing_student_logins;

create temporary table temp_missing_teacher_logins as
select
  gen_random_uuid() as user_id,
  t.id as teacher_id,
  t.name,
  lower(trim(t.email)) as email
from public.teachers t
left join auth.users au
  on lower(au.email) = lower(trim(t.email))
where t.profile_id is null
  and coalesce(trim(t.email), '') <> ''
  and au.id is null;

create temporary table temp_missing_student_logins as
select
  gen_random_uuid() as user_id,
  s.id as student_id,
  s.name,
  lower(trim(s.email)) as email
from public.students s
left join auth.users au
  on lower(au.email) = lower(trim(s.email))
where s.profile_id is null
  and coalesce(trim(s.email), '') <> ''
  and au.id is null;

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
  tmtl.user_id,
  'authenticated',
  'authenticated',
  tmtl.email,
  crypt('Teacher@123', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', tmtl.name, 'role', 'Teacher', 'email_verified', true),
  timezone('utc', now()),
  timezone('utc', now()),
  false,
  false
from temp_missing_teacher_logins tmtl;

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
  tmsl.user_id,
  'authenticated',
  'authenticated',
  tmsl.email,
  crypt('Student@123', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', tmsl.name, 'role', 'Student', 'email_verified', true),
  timezone('utc', now()),
  timezone('utc', now()),
  false,
  false
from temp_missing_student_logins tmsl;

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
  tmtl.email,
  tmtl.user_id,
  jsonb_build_object('sub', tmtl.user_id::text, 'email', tmtl.email, 'email_verified', true),
  'email',
  null,
  timezone('utc', now()),
  timezone('utc', now())
from temp_missing_teacher_logins tmtl;

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
  tmsl.email,
  tmsl.user_id,
  jsonb_build_object('sub', tmsl.user_id::text, 'email', tmsl.email, 'email_verified', true),
  'email',
  null,
  timezone('utc', now()),
  timezone('utc', now())
from temp_missing_student_logins tmsl;

insert into public.profiles (id, name, email, role)
select
  au.id,
  t.name,
  t.email,
  'Teacher'
from public.teachers t
join auth.users au
  on lower(au.email) = lower(trim(t.email))
left join public.profiles p
  on p.id = au.id
where t.profile_id is null
  and p.id is null;

insert into public.profiles (id, name, email, role)
select
  au.id,
  s.name,
  s.email,
  'Student'
from public.students s
join auth.users au
  on lower(au.email) = lower(trim(s.email))
left join public.profiles p
  on p.id = au.id
where s.profile_id is null
  and p.id is null;

update public.teachers t
set profile_id = p.id
from public.profiles p
where t.profile_id is null
  and lower(trim(t.email)) = lower(p.email);

update public.students s
set profile_id = p.id
from public.profiles p
where s.profile_id is null
  and lower(trim(s.email)) = lower(p.email);

drop table if exists temp_missing_teacher_logins;
drop table if exists temp_missing_student_logins;
