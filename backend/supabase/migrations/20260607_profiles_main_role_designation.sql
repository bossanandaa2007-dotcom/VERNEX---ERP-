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

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  main_role text not null,
  designation text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles
drop constraint if exists user_profiles_main_role_check;

alter table public.user_profiles
add constraint user_profiles_main_role_check
check (main_role in ('admin', 'teacher', 'student', 'accountant', 'librarian', 'governing_body'));

create unique index if not exists user_profiles_auth_user_id_uidx
on public.user_profiles (auth_user_id);

create unique index if not exists user_profiles_email_uidx
on public.user_profiles (lower(email));

create index if not exists user_profiles_main_role_idx
on public.user_profiles (main_role);

insert into public.user_profiles (
  auth_user_id,
  email,
  full_name,
  main_role,
  designation,
  is_active,
  created_at,
  updated_at
)
select
  p.id,
  lower(trim(p.email)),
  coalesce(nullif(trim(p.name), ''), p.email),
  public.normalize_app_main_role(p.role),
  p.role,
  true,
  coalesce(p.created_at, timezone('utc', now())),
  timezone('utc', now())
from public.profiles p
where public.normalize_app_main_role(p.role) is not null
on conflict (auth_user_id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  main_role = excluded.main_role,
  designation = coalesce(public.user_profiles.designation, excluded.designation),
  updated_at = timezone('utc', now());

create or replace function public.touch_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := lower(trim(new.email));
  new.main_role := public.normalize_app_main_role(new.main_role);

  if new.main_role is null then
    raise exception 'Invalid user profile main role';
  end if;

  if new.designation is not null then
    new.designation := nullif(trim(new.designation), '');
  end if;

  new.full_name := coalesce(nullif(trim(new.full_name), ''), new.email);
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_user_profiles_updated_at_before_write on public.user_profiles;

create trigger touch_user_profiles_updated_at_before_write
before insert or update of email, full_name, main_role, designation, is_active
on public.user_profiles
for each row
execute function public.touch_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;

create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth_user_id = auth.uid());
