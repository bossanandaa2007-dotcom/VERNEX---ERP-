create or replace function public.get_section_subject_exam_highs(target_section_id uuid)
returns table (
  subject_name text,
  exam_type text,
  highest_marks integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sm.subject_name,
    sm.exam_type,
    max(sm.marks)::integer as highest_marks
  from public.student_marks sm
  where sm.section_id = target_section_id
    and (
      public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
      or exists (
        select 1
        from public.students s
        where s.profile_id = auth.uid()
          and s.section_id = target_section_id
      )
      or exists (
        select 1
        from public.sections sec
        where sec.id = target_section_id
          and sec.name = any(public.current_teacher_class_names())
      )
    )
  group by sm.subject_name, sm.exam_type
$$;

grant execute on function public.get_section_subject_exam_highs(uuid) to authenticated;
