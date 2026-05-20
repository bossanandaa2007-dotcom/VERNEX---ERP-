create or replace function public.normalize_subject_name(raw_subject text)
returns text
language sql
immutable
as $$
  select case
    when raw_subject is null then null
    when lower(trim(raw_subject)) in ('math', 'maths', 'mathematics') then 'Mathematics'
    else trim(raw_subject)
  end
$$;

delete from public.section_teacher_assignments sta
using public.teachers t
where sta.section_id = t.home_section_id
  and sta.role = 'Subject Teacher'
  and public.normalize_subject_name(sta.subject) = 'Mathematics'
  and public.normalize_subject_name(t.subject) = 'Mathematics';

update public.assignments
set subject = public.normalize_subject_name(subject)
where subject is distinct from public.normalize_subject_name(subject);

update public.student_marks
set subject_name = public.normalize_subject_name(subject_name)
where subject_name is distinct from public.normalize_subject_name(subject_name);

update public.section_teacher_assignments
set subject = public.normalize_subject_name(subject)
where subject is distinct from public.normalize_subject_name(subject);

update public.teachers
set subject = public.normalize_subject_name(subject)
where subject is distinct from public.normalize_subject_name(subject);

update public.teachers
set subjects = (
  select array_agg(subject_name order by subject_name)
  from (
    select distinct public.normalize_subject_name(subject_name) as subject_name
    from unnest(coalesce(teachers.subjects, '{}'::text[])) as subject_name
    where public.normalize_subject_name(subject_name) is not null
  ) normalized_subjects
)
where subjects is not null;

delete from public.study_materials math_slot
using public.study_materials mathematics_slot
where math_slot.section_id = mathematics_slot.section_id
  and public.normalize_subject_name(math_slot.subject) = 'Mathematics'
  and public.normalize_subject_name(mathematics_slot.subject) = 'Mathematics'
  and math_slot.id <> mathematics_slot.id
  and math_slot.subject <> mathematics_slot.subject
  and mathematics_slot.subject = 'Mathematics';

update public.study_materials
set
  subject = public.normalize_subject_name(subject),
  title = class_name || ' ' || public.normalize_subject_name(subject) || ' Study Folder'
where subject is distinct from public.normalize_subject_name(subject)
   or title is distinct from class_name || ' ' || public.normalize_subject_name(subject) || ' Study Folder';

update public.subjects
set name = public.normalize_subject_name(name)
where name is distinct from public.normalize_subject_name(name);

update public.teachers t
set subjects = teacher_scope.subjects
from (
  select
    teacher.id,
    array_agg(distinct scoped_subject order by scoped_subject) as subjects
  from public.teachers teacher
  left join (
    select
      t_inner.id as teacher_id,
      public.normalize_subject_name(t_inner.subject) as scoped_subject
    from public.teachers t_inner
    where coalesce(trim(t_inner.subject), '') <> ''

    union all

    select
      sta.teacher_id,
      public.normalize_subject_name(sta.subject) as scoped_subject
    from public.section_teacher_assignments sta
    where coalesce(trim(sta.subject), '') <> ''
  ) scope_rows on scope_rows.teacher_id = teacher.id
  group by teacher.id
) teacher_scope
where teacher_scope.id = t.id;
