create or replace function public.provision_teacher_login(target_teacher_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  teacher_default_password_hash constant text := '$2a$10$8pGx/MqFYZtxWGP5HIRMhu0Nk.v7E66jpOFSZlFa0wqu0rMR3Q6MW';
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
      teacher_default_password_hash,
      timezone('utc', now()),
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
      lower(trim(teacher_row.email)),
      next_user_id,
      jsonb_build_object('sub', next_user_id::text, 'email', lower(trim(teacher_row.email)), 'email_verified', true),
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
      lower(trim(teacher_row.email)),
      existing_auth_user_id,
      jsonb_build_object('sub', existing_auth_user_id::text, 'email', lower(trim(teacher_row.email)), 'email_verified', true),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    where not exists (
      select 1
      from auth.identities ai
      where ai.user_id = existing_auth_user_id
        and lower(ai.provider_id) = lower(trim(teacher_row.email))
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
  student_default_password_hash constant text := '$2a$10$IdWqcnykl0EO3xL7.LLKXuxgmQ0og01jBh27rTW34W..zPXu6sQmy';
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
      student_default_password_hash,
      timezone('utc', now()),
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
      lower(trim(student_row.email)),
      next_user_id,
      jsonb_build_object('sub', next_user_id::text, 'email', lower(trim(student_row.email)), 'email_verified', true),
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
      lower(trim(student_row.email)),
      existing_auth_user_id,
      jsonb_build_object('sub', existing_auth_user_id::text, 'email', lower(trim(student_row.email)), 'email_verified', true),
      'email',
      null,
      timezone('utc', now()),
      timezone('utc', now())
    where not exists (
      select 1
      from auth.identities ai
      where ai.user_id = existing_auth_user_id
        and lower(ai.provider_id) = lower(trim(student_row.email))
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

grant execute on function public.provision_teacher_login(uuid) to authenticated;
grant execute on function public.provision_student_login(uuid) to authenticated;
