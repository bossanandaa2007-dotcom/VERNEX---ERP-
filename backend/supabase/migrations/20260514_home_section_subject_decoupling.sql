alter table public.teachers
add column if not exists home_section_subject text;

update public.teachers
set home_section_subject = public.normalize_subject_name(subject)
where home_section_id is not null
  and coalesce(trim(home_section_subject), '') = ''
  and coalesce(trim(subject), '') <> '';

create or replace function public.current_teacher_subject_names()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct subject_name) filter (where subject_name is not null and trim(subject_name) <> ''), '{}'::text[])
  from (
    select public.normalize_subject_name(t.subject) as subject_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select public.normalize_subject_name(t.home_section_subject) as subject_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select public.normalize_subject_name(unnest(coalesce(t.subjects, '{}'::text[]))) as subject_name
    from public.teachers t
    where t.profile_id = auth.uid()

    union

    select public.normalize_subject_name(sta.subject) as subject_name
    from public.section_teacher_assignments sta
    where sta.teacher_profile_id = auth.uid()
      and sta.role = 'Subject Teacher'
  ) scoped_subjects
$$;

create or replace function public.teacher_handles_class_subject(target_section_id uuid, target_class_name text, target_subject_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select
        sta.section_id,
        sec.name as class_name,
        public.normalize_subject_name(sta.subject) as subject
      from public.section_teacher_assignments sta
      join public.sections sec on sec.id = sta.section_id
      where sta.teacher_profile_id = auth.uid()
        and sta.role = 'Subject Teacher'

      union all

      select
        t.home_section_id as section_id,
        home_sec.name as class_name,
        public.normalize_subject_name(t.home_section_subject) as subject
      from public.teachers t
      join public.sections home_sec on home_sec.id = t.home_section_id
      where t.profile_id = auth.uid()
        and coalesce(trim(t.home_section_subject), '') <> ''
    ) teacher_scope
    where teacher_scope.section_id = target_section_id
      and teacher_scope.class_name = target_class_name
      and lower(trim(teacher_scope.subject)) = lower(trim(target_subject_name))
  )
$$;
