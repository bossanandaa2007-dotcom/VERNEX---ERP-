insert into public.profiles (
  id,
  name,
  email,
  role,
  class_name,
  classes,
  standards,
  subject
)
select
  au.id,
  t.name,
  t.email,
  'Teacher',
  t.assigned_class,
  t.standards,
  t.standards,
  t.subject
from public.teachers t
join auth.users au
  on lower(au.email) = lower(t.email)
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  class_name = excluded.class_name,
  classes = excluded.classes,
  standards = excluded.standards,
  subject = excluded.subject;

update public.teachers t
set profile_id = au.id
from auth.users au
where lower(au.email) = lower(t.email)
  and (t.profile_id is null or t.profile_id <> au.id);
