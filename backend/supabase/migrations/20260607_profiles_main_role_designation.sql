create or replace function public.normalize_app_main_role(input_role text)
returns text
language sql
immutable
as $$
  select case
    when input_role is null then null
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in ('admin') then 'admin'
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in ('teacher') then 'teacher'
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in ('student') then 'student'
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in ('accountant') then 'accountant'
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in ('librarian') then 'librarian'
    when lower(regexp_replace(trim(input_role), '[[:space:]-]+', '_', 'g')) in (
      'governing_body',
      'governing',
      'principal',
      'headmaster',
      'hm',
      'correspondent',
      'vice_principal',
      'pt_sir',
      'administrator',
      'management',
      'management_member'
    ) then 'governing_body'
    else null
  end
$$;

create or replace function public.main_role_display_label(input_main_role text)
returns text
language sql
immutable
as $$
  select case input_main_role
    when 'admin' then 'Admin'
    when 'teacher' then 'Teacher'
    when 'student' then 'Student'
    when 'accountant' then 'Accountant'
    when 'librarian' then 'Librarian'
    when 'governing_body' then 'Governing Body'
    else null
  end
$$;

alter table public.profiles
add column if not exists auth_user_id uuid references auth.users (id) on delete cascade,
add column if not exists full_name text,
add column if not exists main_role text,
add column if not exists designation text,
add column if not exists is_active boolean not null default true,
add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set
  auth_user_id = coalesce(auth_user_id, id),
  full_name = coalesce(nullif(trim(full_name), ''), name),
  main_role = coalesce(public.normalize_app_main_role(main_role), public.normalize_app_main_role(role)),
  designation = coalesce(nullif(trim(designation), ''), role),
  updated_at = coalesce(updated_at, created_at, timezone('utc', now()))
where
  auth_user_id is null
  or full_name is null
  or main_role is null
  or designation is null
  or updated_at is null;

alter table public.profiles
alter column auth_user_id set not null,
alter column main_role set not null;

alter table public.profiles
drop constraint if exists profiles_main_role_check;

alter table public.profiles
add constraint profiles_main_role_check
check (main_role in ('admin', 'teacher', 'student', 'accountant', 'librarian', 'governing_body'));

create unique index if not exists profiles_auth_user_id_uidx
on public.profiles (auth_user_id);

create index if not exists profiles_email_idx
on public.profiles (lower(email));

create index if not exists profiles_main_role_idx
on public.profiles (main_role);

create or replace function public.sync_profile_role_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_role text;
  legacy_role text;
begin
  new.auth_user_id := coalesce(new.auth_user_id, new.id);
  new.full_name := coalesce(nullif(trim(new.full_name), ''), new.name);

  normalized_role := coalesce(
    public.normalize_app_main_role(new.main_role),
    public.normalize_app_main_role(new.role)
  );

  if normalized_role is null then
    raise exception 'Invalid profile main role: %', coalesce(new.main_role, new.role);
  end if;

  legacy_role := public.main_role_display_label(normalized_role);
  if legacy_role is null then
    raise exception 'Invalid canonical profile main role: %', normalized_role;
  end if;

  new.main_role := normalized_role;
  new.role := legacy_role;
  new.designation := coalesce(nullif(trim(new.designation), ''), legacy_role);
  new.updated_at := timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists sync_profile_role_fields_before_write on public.profiles;

create trigger sync_profile_role_fields_before_write
before insert or update of auth_user_id, full_name, name, main_role, role, designation
on public.profiles
for each row
execute function public.sync_profile_role_fields();
