create or replace function public.provision_teacher_login(target_teacher_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher_row public.teachers%rowtype;
  existing_auth_user_id uuid;
  existing_profile_id uuid;
  next_user_id uuid;
begin
  if public.current_profile_role() <> 'Admin' then
    raise exception 'Only admins can provision teacher logins.';
  end if;

  select *
  into teacher_row
  from public.teachers
  where id = target_teacher_id;

  if not found then
    raise exception 'Teacher not found.';
  end if;

  if coalesce(trim(teacher_row.email), '') = '' then
    raise exception 'Teacher email is required to provision login.';
  end if;

  if teacher_row.profile_id is not null then
    return teacher_row.profile_id;
  end if;

  select id
  into existing_auth_user_id
  from auth.users
  where lower(email) = lower(trim(teacher_row.email))
  limit 1;

  if existing_auth_user_id is null then
    next_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      phone_change,
      phone_change_token,
      recovery_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      next_user_id,
      'authenticated',
      'authenticated',
      lower(trim(teacher_row.email)),
      extensions.crypt('Teacher@123', extensions.gen_salt('bf', 10)),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', teacher_row.name, 'role', 'Teacher', 'email_verified', true),
      timezone('utc', now()),
      timezone('utc', now()),
      false,
      false
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      next_user_id::text,
      next_user_id,
      jsonb_build_object('sub', next_user_id::text, 'email', lower(trim(teacher_row.email)), 'email_verified', false, 'phone_verified', false),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    );

    existing_auth_user_id := next_user_id;
  else
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
      existing_auth_user_id::text,
      existing_auth_user_id,
      jsonb_build_object('sub', existing_auth_user_id::text, 'email', lower(trim(teacher_row.email)), 'email_verified', false, 'phone_verified', false),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    where not exists (
      select 1
      from auth.identities ai
      where ai.user_id = existing_auth_user_id
        and ai.provider = 'email'
    );
  end if;

  select id
  into existing_profile_id
  from public.profiles
  where id = existing_auth_user_id
  limit 1;

  if existing_profile_id is null then
    insert into public.profiles (id, name, email, role)
    values (existing_auth_user_id, teacher_row.name, lower(trim(teacher_row.email)), 'Teacher');
  else
    update public.profiles
    set
      name = teacher_row.name,
      email = lower(trim(teacher_row.email)),
      role = 'Teacher'
    where id = existing_auth_user_id;
  end if;

  update public.teachers
  set profile_id = existing_auth_user_id
  where id = target_teacher_id;

  return existing_auth_user_id;
end;
$$;

create or replace function public.provision_student_login(target_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students%rowtype;
  existing_auth_user_id uuid;
  existing_profile_id uuid;
  next_user_id uuid;
begin
  if public.current_profile_role() not in ('Admin', 'Teacher') then
    raise exception 'Only admins and teachers can provision student logins.';
  end if;

  select *
  into student_row
  from public.students
  where id = target_student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  if coalesce(trim(student_row.email), '') = '' then
    raise exception 'Student email is required to provision login.';
  end if;

  if student_row.profile_id is not null then
    return student_row.profile_id;
  end if;

  select id
  into existing_auth_user_id
  from auth.users
  where lower(email) = lower(trim(student_row.email))
  limit 1;

  if existing_auth_user_id is null then
    next_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      phone_change,
      phone_change_token,
      recovery_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      next_user_id,
      'authenticated',
      'authenticated',
      lower(trim(student_row.email)),
      extensions.crypt('Student@123', extensions.gen_salt('bf', 10)),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', student_row.name, 'role', 'Student', 'email_verified', true),
      timezone('utc', now()),
      timezone('utc', now()),
      false,
      false
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      next_user_id::text,
      next_user_id,
      jsonb_build_object('sub', next_user_id::text, 'email', lower(trim(student_row.email)), 'email_verified', false, 'phone_verified', false),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    );

    existing_auth_user_id := next_user_id;
  else
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
      existing_auth_user_id::text,
      existing_auth_user_id,
      jsonb_build_object('sub', existing_auth_user_id::text, 'email', lower(trim(student_row.email)), 'email_verified', false, 'phone_verified', false),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    where not exists (
      select 1
      from auth.identities ai
      where ai.user_id = existing_auth_user_id
        and ai.provider = 'email'
    );
  end if;

  select id
  into existing_profile_id
  from public.profiles
  where id = existing_auth_user_id
  limit 1;

  if existing_profile_id is null then
    insert into public.profiles (id, name, email, role)
    values (existing_auth_user_id, student_row.name, lower(trim(student_row.email)), 'Student');
  else
    update public.profiles
    set
      name = student_row.name,
      email = lower(trim(student_row.email)),
      role = 'Student'
    where id = existing_auth_user_id;
  end if;

  update public.students
  set profile_id = existing_auth_user_id
  where id = target_student_id;

  return existing_auth_user_id;
end;
$$;

update auth.identities
set
  provider_id = user_id::text,
  identity_data = jsonb_build_object('sub', user_id::text, 'email', email, 'email_verified', false, 'phone_verified', false)
where provider = 'email'
  and provider_id like '%@%';

update auth.users u
set
  encrypted_password = case
    when p.role = 'Teacher' then extensions.crypt('Teacher@123', extensions.gen_salt('bf', 10))
    when p.role = 'Student' then extensions.crypt('Student@123', extensions.gen_salt('bf', 10))
    else u.encrypted_password
  end,
  email_confirmed_at = coalesce(u.email_confirmed_at, timezone('utc', now())),
  confirmation_token = coalesce(u.confirmation_token, ''),
  email_change = coalesce(u.email_change, ''),
  email_change_token_new = coalesce(u.email_change_token_new, ''),
  email_change_token_current = coalesce(u.email_change_token_current, ''),
  phone_change = coalesce(u.phone_change, ''),
  phone_change_token = coalesce(u.phone_change_token, ''),
  recovery_token = coalesce(u.recovery_token, ''),
  reauthentication_token = coalesce(u.reauthentication_token, '')
from public.profiles p
where p.id = u.id
  and p.role in ('Teacher', 'Student')
  and exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
      and i.provider_id = u.id::text
  );
