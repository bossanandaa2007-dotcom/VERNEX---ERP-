with teacher_map as (
  select
    lower(t.email) as email_key,
    t.id as teacher_id,
    t.profile_id
  from public.teachers t
  where t.profile_id is not null
),
subject_targets as (
  select *
  from (
    values
      ('early learning', 'harikuuty@school.edu'),
      ('art', 'harikuuty@school.edu'),
      ('storytelling', 'harikuuty@school.edu'),
      ('rhymes', 'harikuuty@school.edu'),
      ('tamil', 'vivek@school.edu'),
      ('english', 'nandini@school.edu'),
      ('mathematics', 'teacher@school.edu'),
      ('math', 'teacher@school.edu'),
      ('science', 'anjali@school.edu'),
      ('physics', 'farah@school.edu'),
      ('chemistry', 'dinesh@school.edu'),
      ('botany', 'farah@school.edu'),
      ('zoology', 'kavya@school.edu'),
      ('commerce', 'dinesh@school.edu'),
      ('economics', 'farah@school.edu'),
      ('business', 'kavya@school.edu'),
      ('computer science', 'kavya@school.edu'),
      ('computer application', 'kavya@school.edu')
  ) as target(subject_key, email_key)
),
resolved_targets as (
  select
    st.subject_key,
    tm.teacher_id,
    tm.profile_id
  from subject_targets st
  join teacher_map tm on tm.email_key = st.email_key
)
update public.section_teacher_assignments sta
set
  teacher_id = rt.teacher_id,
  teacher_profile_id = rt.profile_id
from resolved_targets rt
where sta.role = 'Subject Teacher'
  and lower(trim(sta.subject)) = rt.subject_key;
