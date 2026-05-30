insert into public.subjects (category_id, name, code, sort_order)
values
  ('primary', 'Primary Studies', 'PST', 99),
  ('higher-secondary', 'Academic Mentor', 'AM', 99)
on conflict (category_id, name) do update set
  code = excluded.code,
  sort_order = excluded.sort_order;

update public.teachers
set
  subject = case
    when lower(trim(subject)) = 'math' then 'Mathematics'
    when lower(trim(subject)) = 'social' then 'Social Studies'
    else initcap(trim(subject))
  end,
  subjects = case
    when coalesce(trim(subject), '') = '' then '{}'::text[]
    else array[
      case
        when lower(trim(subject)) = 'math' then 'Mathematics'
        when lower(trim(subject)) = 'social' then 'Social Studies'
        else initcap(trim(subject))
      end
    ]
  end;
