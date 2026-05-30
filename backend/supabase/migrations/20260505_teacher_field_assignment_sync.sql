with teacher_scope as (
  select
    t.id,
    hs.name as home_class,
    coalesce(
      array_agg(distinct sta.subject order by sta.subject) filter (where sta.role = 'Subject Teacher' and sta.subject is not null),
      '{}'::text[]
    ) as assignment_subjects,
    coalesce(
      array_agg(distinct sec.name order by sec.name) filter (where sta.role = 'Subject Teacher' and sec.name is not null),
      '{}'::text[]
    ) as assignment_sections
  from public.teachers t
  left join public.sections hs on hs.id = t.home_section_id
  left join public.section_teacher_assignments sta on sta.teacher_id = t.id
  left join public.sections sec on sec.id = sta.section_id
  group by t.id, hs.name
),
normalized as (
  select
    ts.id,
    ts.home_class,
    case
      when ts.home_class is not null then array_cat(array[ts.home_class], ts.assignment_sections)
      else ts.assignment_sections
    end as raw_sections,
    case
      when coalesce(trim(t.subject), '') <> '' then array_cat(array[t.subject], ts.assignment_subjects)
      else ts.assignment_subjects
    end as raw_subjects
  from teacher_scope ts
  join public.teachers t on t.id = ts.id
),
deduped as (
  select
    n.id,
    n.home_class,
    coalesce(
      array(
        select distinct section_name
        from unnest(n.raw_sections) as section_name
        where coalesce(trim(section_name), '') <> ''
        order by section_name
      ),
      '{}'::text[]
    ) as normalized_sections,
    coalesce(
      array(
        select distinct subject_name
        from unnest(n.raw_subjects) as subject_name
        where coalesce(trim(subject_name), '') <> ''
        order by subject_name
      ),
      '{}'::text[]
    ) as normalized_subjects
  from normalized n
)
update public.teachers t
set
  assigned_class = d.home_class,
  standards = d.normalized_sections,
  subject = coalesce(t.subject, d.normalized_subjects[1], 'General'),
  subjects = d.normalized_subjects
from deduped d
where t.id = d.id;
