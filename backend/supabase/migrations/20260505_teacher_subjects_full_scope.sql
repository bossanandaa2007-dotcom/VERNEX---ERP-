update public.teachers t
set subjects = array(
  select distinct normalized_subject
  from (
    select case
      when lower(trim(raw_subject)) = 'math' then 'Mathematics'
      when lower(trim(raw_subject)) = 'social' then 'Social Studies'
      else initcap(trim(raw_subject))
    end as normalized_subject
    from unnest(
      case
        when coalesce(trim(t.subject), '') <> '' then array[t.subject]
        else '{}'::text[]
      end
    ) raw_subject

    union all

    select case
      when lower(trim(sta.subject)) = 'math' then 'Mathematics'
      when lower(trim(sta.subject)) = 'social' then 'Social Studies'
      else initcap(trim(sta.subject))
    end as normalized_subject
    from public.section_teacher_assignments sta
    where sta.teacher_id = t.id
      and sta.role = 'Subject Teacher'
  ) all_subjects
  where coalesce(trim(normalized_subject), '') <> ''
  order by normalized_subject
);
