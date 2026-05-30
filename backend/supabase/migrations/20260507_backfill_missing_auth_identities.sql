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
  lower(trim(u.email)) as provider_id,
  u.id as user_id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', lower(trim(u.email)),
    'email_verified', true
  ) as identity_data,
  'email' as provider,
  null,
  coalesce(u.created_at, timezone('utc', now())),
  timezone('utc', now())
from auth.users u
left join auth.identities i
  on i.user_id = u.id
 and i.provider = 'email'
where u.deleted_at is null
  and coalesce(trim(u.email), '') <> ''
  and i.user_id is null;
