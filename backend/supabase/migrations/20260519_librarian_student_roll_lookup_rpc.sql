create or replace function public.lookup_student_for_library(target_roll_no text)
returns table (
  id uuid,
  name text,
  email text,
  roll_no text,
  category_id text,
  section_id uuid,
  section_name text,
  grade_name text,
  grade_number integer
)
language sql
security definer
set search_path = public
as $$
  select
    student.id,
    student.name,
    student.email,
    student.roll_no,
    student.category_id,
    student.section_id,
    section_row.name as section_name,
    null::text as grade_name,
    null::integer as grade_number
  from public.students student
  left join public.sections section_row on section_row.id = student.section_id
  where lower(trim(student.roll_no)) = lower(trim(target_roll_no))
    and public.current_profile_role() in ('Admin', 'Librarian')
  limit 1;
$$;

grant execute on function public.lookup_student_for_library(text) to authenticated;
