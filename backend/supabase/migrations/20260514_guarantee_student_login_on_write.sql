create or replace function public.provision_student_login_unchecked(target_student_id uuid)
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

  select id
  into existing_auth_user_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if existing_auth_user_id is null and student_row.profile_id is not null then
    select id
    into existing_auth_user_id
    from auth.users
    where id = student_row.profile_id
    limit 1;
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
      extensions.crypt('Student@123', extensions.gen_salt('bf', 10)),
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
      encrypted_password = extensions.crypt('Student@123', extensions.gen_salt('bf', 10)),
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
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
  where id = target_student_id
    and (
      email is distinct from normalized_email
      or profile_id is distinct from existing_auth_user_id
    );

  return existing_auth_user_id;
end;
$$;

create or replace function public.provision_student_login(target_student_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() not in ('Admin', 'Teacher') then
    raise exception 'Only admins and teachers can provision student logins.';
  end if;

  return public.provision_student_login_unchecked(target_student_id);
end;
$$;

grant execute on function public.provision_student_login(uuid) to authenticated;

create or replace function public.normalize_student_login_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.email is not null then
    new.email = lower(trim(new.email));
  end if;

  return new;
end;
$$;

create or replace function public.ensure_student_login_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(new.email), '') <> '' then
    perform public.provision_student_login_unchecked(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_student_login_email_before_write on public.students;
create trigger normalize_student_login_email_before_write
before insert or update of email on public.students
for each row
execute function public.normalize_student_login_email();

drop trigger if exists ensure_student_login_after_insert on public.students;
create trigger ensure_student_login_after_insert
after insert on public.students
for each row
execute function public.ensure_student_login_after_write();

drop trigger if exists ensure_student_login_after_email_name_update on public.students;
create trigger ensure_student_login_after_email_name_update
after update of email, name on public.students
for each row
execute function public.ensure_student_login_after_write();

do $$
declare
  student_record record;
begin
  for student_record in
    select id
    from public.students
    where coalesce(trim(email), '') <> ''
  loop
    perform public.provision_student_login_unchecked(student_record.id);
  end loop;
end;
$$;
