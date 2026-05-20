insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select
  s.id,
  t.id,
  t.profile_id,
  'Subject Teacher',
  subject_name
from public.sections s
join public.teachers t on t.email = 'harikuuty@school.edu'
cross join lateral (
  select unnest(array['Early Learning','Art','Rhymes']) as subject_name
) subjects
where s.name in ('LKG-A','LKG-B','LKG-C','UKG-A','UKG-B','UKG-C')
  and not exists (
    select 1
    from public.section_teacher_assignments sta
    where sta.section_id = s.id
      and sta.role = 'Subject Teacher'
      and sta.subject = subject_name
  );
