delete from public.section_teacher_assignments
where role = 'Subject Teacher';

with section_meta as (
  select
    sec.id,
    sec.name,
    split_part(sec.name, '-', 1) as standard_label,
    split_part(sec.name, '-', 2) as section_letter
  from public.sections sec
),
subject_slots as (
  select
    sm.id as section_id,
    sm.name as section_name,
    subject_name,
    slot_no,
    row_number() over (order by sm.name, slot_no) as slot_index
  from section_meta sm
  cross join lateral (
    select *
    from unnest(
      case
        when sm.standard_label in ('LKG', 'UKG') then array['Early Learning', 'Art', 'Rhymes', 'Storytelling']
        when sm.standard_label in ('1', '2', '3', '4', '5') then array['Tamil', 'English', 'Math', 'Science']
        when sm.standard_label in ('6', '7', '8', '9', '10') then array['Tamil', 'English', 'Math', 'Science']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'A' then array['Physics', 'Chemistry', 'Math', 'Computer Science']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'B' then array['Physics', 'Chemistry', 'Botany', 'Zoology']
        when sm.standard_label in ('11', '12') and sm.section_letter = 'C' then array['Commerce', 'Economics', 'Business', 'Computer Application']
        else array['English', 'Math', 'Science', 'Social']
      end
    ) with ordinality as subjects(subject_name, slot_no)
  ) subjects
),
class_teacher_pool as (
  select
    t.id as teacher_id,
    t.profile_id,
    t.home_section_id,
    row_number() over (order by sec.name) as teacher_no,
    count(*) over () as teacher_count
  from public.teachers t
  join public.sections sec on sec.id = t.home_section_id
),
subject_teacher_rows as (
  select
    ss.section_id,
    picked.teacher_id,
    picked.profile_id as teacher_profile_id,
    'Subject Teacher'::text as role,
    ss.subject_name as subject
  from subject_slots ss
  join lateral (
    select ctp.*
    from class_teacher_pool ctp
    where ctp.home_section_id <> ss.section_id
    order by
      (
        (
          ctp.teacher_no
          - (((ss.slot_index - 1) % ctp.teacher_count) + 1)
          + ctp.teacher_count
        ) % ctp.teacher_count
      )
    limit 1
  ) picked on true
)
insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select section_id, teacher_id, teacher_profile_id, role, subject
from subject_teacher_rows;
