with normalized as (
  select
    p.id,
    case
      when coalesce(p.class_name, '') like '%-%' then split_part(p.class_name, '-', 1)
      when p.standard is not null and p.standard ~ '^\d+th$' then regexp_replace(p.standard, 'th$', '')
      when p.standard is not null and p.standard ~ '^\d+(st|nd|rd)$' then regexp_replace(p.standard, '(st|nd|rd)$', '')
      else p.standard
    end as normalized_standard,
    case
      when coalesce(p.class_name, '') like '%-%' then split_part(p.class_name, '-', 2)
      else p.section
    end as normalized_section,
    case
      when coalesce(array_length(p.classes, 1), 0) > 0 then (
        select array_agg(distinct cls order by cls)
        from unnest(p.classes) as cls
        where cls is not null and btrim(cls) <> ''
      )
      when coalesce(p.class_name, '') <> '' then array[p.class_name]
      else null
    end as normalized_classes
  from public.profiles p
),
standards_from_classes as (
  select
    n.id,
    n.normalized_standard,
    n.normalized_section,
    n.normalized_classes,
    case
      when coalesce(array_length(n.normalized_classes, 1), 0) > 0 then (
        select array_agg(distinct split_part(cls, '-', 1) order by split_part(cls, '-', 1))
        from unnest(n.normalized_classes) as cls
        where cls is not null and btrim(cls) <> ''
      )
      when n.normalized_standard is not null then array[n.normalized_standard]
      else null
    end as normalized_standards
  from normalized n
)
update public.profiles p
set
  standard = s.normalized_standard,
  section = s.normalized_section,
  classes = s.normalized_classes,
  standards = s.normalized_standards
from standards_from_classes s
where p.id = s.id;
