delete from public.section_teacher_assignments assignment
where assignment.teacher_id in (
  select t.id
  from public.teachers t
  where t.profile_id is null
);

delete from public.teachers
where profile_id is null
  and email = 'suresh@school.edu';

create unique index if not exists section_one_class_teacher_idx
on public.section_teacher_assignments (section_id)
where role = 'Class Teacher';
