with teacher_scopes as (
  select
    t.home_section_id as section_id,
    sec.name as class_name,
    t.subject as subject,
    t.profile_id as teacher_profile_id
  from public.teachers t
  join public.sections sec on sec.id = t.home_section_id
  where t.profile_id is not null
    and coalesce(trim(t.subject), '') <> ''

  union all

  select
    sta.section_id,
    sec.name as class_name,
    sta.subject,
    sta.teacher_profile_id
  from public.section_teacher_assignments sta
  join public.sections sec on sec.id = sta.section_id
  where sta.role = 'Subject Teacher'
    and sta.teacher_profile_id is not null
    and coalesce(trim(sta.subject), '') <> ''
),
deduped_scopes as (
  select distinct on (section_id, lower(trim(subject)))
    section_id,
    class_name,
    subject,
    teacher_profile_id
  from teacher_scopes
  order by section_id, lower(trim(subject)), teacher_profile_id
)
insert into public.study_materials (
  title,
  subject,
  class_name,
  section_id,
  teacher_profile_id,
  upload_date,
  drive_url
)
select
  ds.class_name || ' ' || ds.subject || ' Study Folder' as title,
  ds.subject,
  ds.class_name,
  ds.section_id,
  ds.teacher_profile_id,
  current_date,
  null
from deduped_scopes ds
on conflict (section_id, subject) do update
set
  title = excluded.title,
  class_name = excluded.class_name,
  teacher_profile_id = excluded.teacher_profile_id,
  upload_date = excluded.upload_date;
