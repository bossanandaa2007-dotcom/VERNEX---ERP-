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
        sta.subject
      from public.section_teacher_assignments sta
      join public.sections sec on sec.id = sta.section_id
      where sta.teacher_profile_id = auth.uid()
        and sta.role = 'Subject Teacher'

      union all

      select
        t.home_section_id as section_id,
        home_sec.name as class_name,
        t.subject as subject
      from public.teachers t
      join public.sections home_sec on home_sec.id = t.home_section_id
      where t.profile_id = auth.uid()
        and coalesce(trim(t.subject), '') <> ''
    ) teacher_scope
    where teacher_scope.section_id = target_section_id
      and teacher_scope.class_name = target_class_name
      and lower(trim(teacher_scope.subject)) = lower(trim(target_subject_name))
  )
$$;
