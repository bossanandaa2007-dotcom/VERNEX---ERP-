alter table public.profiles
add column if not exists designation text;

update public.profiles
set designation = nullif(trim(designation), '')
where designation is not null;

update public.profiles
set
  designation = coalesce(
    nullif(trim(designation), ''),
    case
      when role <> 'Governing Body' then nullif(trim(role), '')
      else null
    end
  ),
  role = 'Governing Body'
where public.normalize_app_main_role(role) = 'governing_body'
  and role <> 'Governing Body';

update public.user_profiles user_profile
set
  main_role = coalesce(public.normalize_app_main_role(user_profile.main_role), public.normalize_app_main_role(profile.role)),
  designation = case
    when coalesce(public.normalize_app_main_role(user_profile.main_role), public.normalize_app_main_role(profile.role)) = 'governing_body' then
      coalesce(
        nullif(nullif(trim(user_profile.designation), ''), 'Governing Body'),
        nullif(trim(profile.designation), ''),
        case
          when profile.role <> 'Governing Body' then nullif(trim(profile.role), '')
          else null
        end,
        nullif(trim(user_profile.designation), '')
      )
    else user_profile.designation
  end,
  updated_at = timezone('utc', now())
from public.profiles profile
where user_profile.auth_user_id = profile.id
  or lower(user_profile.email) = lower(profile.email);

create or replace function public.list_governing_body_recipients()
returns table (
  id uuid,
  name text,
  designation text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    nullif(trim(p.designation), '') as designation
  from public.profiles p
  where p.role = 'Governing Body'
  order by p.name asc, p.id asc
$$;

grant execute on function public.list_governing_body_recipients() to authenticated;
