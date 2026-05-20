insert into public.subjects (category_id, name, code, sort_order)
values
  ('kindergarten', 'Early Learning', 'EL', 0),
  ('kindergarten', 'Storytelling', 'STORY', 6),
  ('kindergarten', 'English', 'ENG', 10),
  ('kindergarten', 'Mathematics', 'MATH', 11),
  ('kindergarten', 'EVS', 'EVS', 12),
  ('primary', 'Tamil', 'TAM', 0),
  ('primary', 'English', 'ENG', 1),
  ('primary', 'Mathematics', 'MATH', 2),
  ('primary', 'Science', 'SCI', 3),
  ('primary', 'Social Studies', 'SST', 4),
  ('secondary', 'Tamil', 'TAM', 0),
  ('secondary', 'English', 'ENG', 1),
  ('secondary', 'Mathematics', 'MATH', 2),
  ('secondary', 'Science', 'SCI', 3),
  ('secondary', 'Social Studies', 'SST', 4),
  ('higher-secondary', 'Tamil', 'TAM', 0),
  ('higher-secondary', 'English', 'ENG', 1),
  ('higher-secondary', 'Mathematics', 'MATH', 2),
  ('higher-secondary', 'Physics', 'PHY', 3),
  ('higher-secondary', 'Chemistry', 'CHE', 4),
  ('higher-secondary', 'Botany', 'BOT', 5),
  ('higher-secondary', 'Zoology', 'ZOO', 6),
  ('higher-secondary', 'Commerce', 'COM', 7),
  ('higher-secondary', 'Economics', 'ECO', 8),
  ('higher-secondary', 'Business', 'BUS', 9),
  ('higher-secondary', 'Computer Science', 'CS', 10),
  ('higher-secondary', 'Computer Application', 'CA', 11),
  ('higher-secondary', 'Hindi', 'HIN', 12),
  ('higher-secondary', 'French', 'FR', 13)
on conflict (category_id, name) do update set
  code = excluded.code,
  sort_order = excluded.sort_order;

update public.teachers
set
  subject = case
    when lower(trim(subject)) = 'math' then 'Mathematics'
    when lower(trim(subject)) = 'social' then 'Social Studies'
    else subject
  end,
  subjects = array(
    select distinct normalized_subject
    from unnest(
      coalesce(subjects, '{}'::text[])
      || case when coalesce(subject, '') <> '' then array[subject] else '{}'::text[] end
    ) raw_subject
    cross join lateral (
      select case
        when lower(trim(raw_subject)) = 'math' then 'Mathematics'
        when lower(trim(raw_subject)) = 'social' then 'Social Studies'
        else initcap(trim(raw_subject))
      end as normalized_subject
    ) normalized
    where normalized_subject <> ''
    order by normalized_subject
  );

update public.section_teacher_assignments
set subject = case
  when lower(trim(subject)) = 'math' then 'Mathematics'
  when lower(trim(subject)) = 'social' then 'Social Studies'
  else initcap(trim(subject))
end
where role = 'Subject Teacher';

with teacher_assignment_subjects as (
  select
    t.id as teacher_id,
    array_agg(distinct assignment_subject order by assignment_subject) as assignment_subjects
  from public.teachers t
  left join lateral (
    select case
      when lower(trim(sta.subject)) = 'math' then 'Mathematics'
      when lower(trim(sta.subject)) = 'social' then 'Social Studies'
      else initcap(trim(sta.subject))
    end as assignment_subject
    from public.section_teacher_assignments sta
    where sta.teacher_id = t.id
      and sta.role = 'Subject Teacher'
  ) assignment_subjects on true
  group by t.id
)
update public.teachers t
set subjects = array(
  select distinct normalized_subject
  from unnest(
    coalesce(tas.assignment_subjects, '{}'::text[])
    || coalesce(t.subjects, '{}'::text[])
    || case when coalesce(t.subject, '') <> '' then array[t.subject] else '{}'::text[] end
  ) raw_subject
  cross join lateral (
    select case
      when lower(trim(raw_subject)) = 'math' then 'Mathematics'
      when lower(trim(raw_subject)) = 'social' then 'Social Studies'
      else initcap(trim(raw_subject))
    end as normalized_subject
  ) normalized
  where normalized_subject <> ''
  order by normalized_subject
)
from teacher_assignment_subjects tas
where tas.teacher_id = t.id;
