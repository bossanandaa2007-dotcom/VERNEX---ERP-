update public.teachers
set home_section_id = null
where email = 'class.teacher.10a@school.edu';

update public.teachers
set
  home_section_id = (select id from public.sections where name = '10-A'),
  assigned_class = '10-A',
  standards = array['10-A']
where email = 'teacher@school.edu';

update public.teachers
set
  name = 'Class Teacher 6-B',
  email = 'class.teacher.6b@school.edu',
  home_section_id = (select id from public.sections where name = '6-B'),
  assigned_class = '6-B',
  standards = array['6-B']
where email = 'class.teacher.10a@school.edu';

update public.leave_requests lr
set
  teacher_profile_id = home_teacher.profile_id,
  teacher_name = home_teacher.name,
  updated_at = timezone('utc', now())
from public.sections sec
join public.teachers home_teacher on home_teacher.home_section_id = sec.id
where lr.class_name = sec.name
  and lr.recipient_type = 'Class Teacher'
  and home_teacher.profile_id is not null
  and (
    lr.teacher_profile_id is distinct from home_teacher.profile_id
    or lr.teacher_name is distinct from home_teacher.name
  );
