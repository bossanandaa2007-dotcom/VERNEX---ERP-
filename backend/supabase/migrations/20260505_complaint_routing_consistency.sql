update public.complaints c
set target_id = home_teacher.profile_id::text
from public.sections sec
join public.teachers home_teacher on home_teacher.home_section_id = sec.id
where c.class_name = sec.name
  and c.target_role = 'Teacher'
  and c.target_type = 'Class Teacher'
  and home_teacher.profile_id is not null
  and (
    c.target_id is null
    or c.target_id = 'teacher-class'
    or not exists (
      select 1
      from public.profiles p
      where p.id::text = c.target_id
    )
  );

update public.complaints c
set
  target_id = governing_profile.id::text,
  target_role = 'Governing Body',
  target_type = 'Governing Body'
from public.profiles governing_profile
where governing_profile.role = 'Governing Body'
  and c.target_role = 'Teacher'
  and c.target_type = 'Class Teacher'
  and not exists (
    select 1
    from public.profiles p
    where p.id::text = c.target_id
  );
