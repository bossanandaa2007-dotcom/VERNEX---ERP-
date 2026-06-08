create or replace function public.provision_student_login_with_password(
  target_student_id uuid,
  target_password text
)
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
  normalized_email text;
begin
  if public.current_profile_role() <> 'Admin' then
    raise exception 'Only admins can provision student logins.';
  end if;

  if length(coalesce(target_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  select *
  into student_row
  from public.students
  where id = target_student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  normalized_email := lower(trim(coalesce(student_row.email, '')));

  if normalized_email = '' then
    raise exception 'Student email is required to provision login.';
  end if;

  if student_row.profile_id is not null then
    existing_auth_user_id := student_row.profile_id;
  else
    select id
    into existing_auth_user_id
    from auth.users
    where lower(email) = normalized_email
    limit 1;

    if existing_auth_user_id is not null then
      raise exception 'A login already exists for this email address.';
    end if;
  end if;

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
      normalized_email,
      extensions.crypt(target_password, extensions.gen_salt('bf', 10)),
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

    existing_auth_user_id := next_user_id;
  else
    update auth.users
    set
      email = normalized_email,
      encrypted_password = extensions.crypt(target_password, extensions.gen_salt('bf', 10)),
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      confirmed_at = coalesce(confirmed_at, timezone('utc', now())),
      confirmation_token = coalesce(confirmation_token, ''),
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      phone_change = coalesce(phone_change, ''),
      phone_change_token = coalesce(phone_change_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      reauthentication_token = coalesce(reauthentication_token, ''),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('name', student_row.name, 'role', 'Student', 'email_verified', true),
      updated_at = timezone('utc', now()),
      is_sso_user = false,
      is_anonymous = false
    where id = existing_auth_user_id;
  end if;

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
    jsonb_build_object('sub', existing_auth_user_id::text, 'email', normalized_email, 'email_verified', true, 'phone_verified', false),
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

  update auth.identities
  set
    provider_id = existing_auth_user_id::text,
    identity_data = jsonb_build_object('sub', existing_auth_user_id::text, 'email', normalized_email, 'email_verified', true, 'phone_verified', false),
    updated_at = timezone('utc', now())
  where user_id = existing_auth_user_id
    and provider = 'email';

  select id
  into existing_profile_id
  from public.profiles
  where id = existing_auth_user_id
  limit 1;

  if existing_profile_id is null then
    insert into public.profiles (id, name, email, role)
    values (existing_auth_user_id, student_row.name, normalized_email, 'Student');
  else
    update public.profiles
    set
      name = student_row.name,
      email = normalized_email,
      role = 'Student'
    where id = existing_auth_user_id;
  end if;

  update public.students
  set
    email = normalized_email,
    profile_id = existing_auth_user_id
  where id = target_student_id;

  return existing_auth_user_id;
end;
$$;

drop function if exists public.admin_create_student_with_login(text, text, text, text, text, uuid, text, date, text, text, text, text);
drop function if exists public.admin_create_student_with_login(text, text, text, text, date, text, text, text, text, text, uuid, text);

create or replace function public.admin_create_student_with_login(
  target_address text,
  target_category_id text,
  target_contact text,
  target_dob text,
  target_email text,
  target_gender text,
  target_name text,
  target_parent_contact text,
  target_parent_name text,
  target_password text,
  target_roll_no text,
  target_section_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_student_id uuid;
  normalized_email text;
  parsed_dob date;
  parsed_section_id uuid;
begin
  if public.current_profile_role() <> 'Admin' then
    raise exception 'Only admins can create student logins.';
  end if;

  normalized_email := lower(trim(coalesce(target_email, '')));

  if normalized_email = '' then
    raise exception 'Student email is required.';
  end if;

  if trim(coalesce(target_name, '')) = '' then
    raise exception 'Student name is required.';
  end if;

  if trim(coalesce(target_roll_no, '')) = '' then
    raise exception 'Student roll number is required.';
  end if;

  if trim(coalesce(target_dob, '')) = '' then
    raise exception 'Student DOB is required.';
  end if;

  if target_category_id is null or trim(target_category_id) = '' then
    raise exception 'Student level is required.';
  end if;

  if target_section_id is null or trim(target_section_id) = '' then
    raise exception 'Student section is required.';
  end if;

  if length(coalesce(target_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  begin
    parsed_dob := target_dob::date;
  exception
    when others then
      raise exception 'Student DOB must be a valid date.';
  end;

  begin
    parsed_section_id := target_section_id::uuid;
  exception
    when others then
      raise exception 'Student section id must be a valid UUID.';
  end;

  if exists (select 1 from auth.users where lower(email) = normalized_email) then
    raise exception 'A login already exists for this email address.';
  end if;

  insert into public.students (
    category_id,
    section_id,
    name,
    email,
    roll_no,
    gender,
    dob,
    contact,
    parent_name,
    parent_contact,
    address
  )
  values (
    target_category_id,
    parsed_section_id,
    trim(coalesce(target_name, '')),
    normalized_email,
    trim(coalesce(target_roll_no, '')),
    target_gender,
    parsed_dob,
    trim(coalesce(target_contact, '')),
    trim(coalesce(target_parent_name, '')),
    trim(coalesce(target_parent_contact, '')),
    trim(coalesce(target_address, ''))
  )
  returning id into created_student_id;

  perform public.provision_student_login_with_password(created_student_id, target_password);

  return created_student_id;
end;
$$;

grant execute on function public.admin_create_student_with_login(text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
