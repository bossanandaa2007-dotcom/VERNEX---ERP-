alter table public.complaints
drop constraint if exists complaints_type_check;

alter table public.complaints
add constraint complaints_type_check
check (type in ('Academic', 'Infrastructure', 'Discipline', 'Hostel', 'Fees', 'Other'));

create or replace function public.submit_complaint(
  target_title text,
  target_description text,
  target_type text,
  target_priority text,
  target_target_id text,
  target_target_role text,
  target_target_type text
)
returns public.complaints
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students;
  normalized_division text;
  created_row public.complaints;
begin
  if public.current_profile_role() <> 'Student' then
    raise exception 'Only students can submit complaints.';
  end if;

  if target_type not in ('Academic', 'Infrastructure', 'Discipline', 'Hostel', 'Fees', 'Other') then
    raise exception 'Invalid complaint type: %', target_type;
  end if;

  if target_priority not in ('Low', 'Medium', 'High') then
    raise exception 'Invalid complaint priority: %', target_priority;
  end if;

  if target_target_type not in ('Class Teacher', 'Subject Teacher', 'Governing Body') then
    raise exception 'Invalid complaint route type: %', target_target_type;
  end if;

  if coalesce(trim(target_title), '') = '' or coalesce(trim(target_description), '') = '' then
    raise exception 'Complaint title and description are required.';
  end if;

  select *
  into student_row
  from public.students
  where profile_id = auth.uid()
  limit 1;

  if student_row.id is null then
    raise exception 'Student record not found for this account.';
  end if;

  normalized_division := case
    when student_row.gender = 'Female' then 'Girls'
    else 'Boys'
  end;

  if target_target_type = 'Class Teacher' then
    if target_target_role <> 'Teacher' then
      raise exception 'Class teacher complaints must target a teacher.';
    end if;

    if not exists (
      select 1
      from public.teachers t
      where t.home_section_id = student_row.section_id
        and t.profile_id::text = target_target_id
    ) then
      raise exception 'Selected class teacher is not assigned to this student section.';
    end if;
  elsif target_target_type = 'Subject Teacher' then
    if target_target_role <> 'Teacher' then
      raise exception 'Subject teacher complaints must target a teacher.';
    end if;

    if not exists (
      select 1
      from public.section_teacher_assignments sta
      where sta.section_id = student_row.section_id
        and sta.teacher_profile_id::text = target_target_id
        and sta.role = 'Subject Teacher'
    ) then
      raise exception 'Selected subject teacher is not assigned to this student section.';
    end if;
  else
    if target_target_role <> 'Governing Body' then
      raise exception 'Governing body complaints must target governing body recipients.';
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.id::text = target_target_id
        and p.role = 'Governing Body'
    ) then
      raise exception 'Selected governing body recipient is invalid.';
    end if;
  end if;

  insert into public.complaints (
    student_id,
    student_name,
    class_name,
    section,
    division,
    title,
    description,
    type,
    target_id,
    target_role,
    target_type,
    priority
  )
  values (
    auth.uid(),
    student_row.name,
    public.current_student_class_name(),
    split_part(public.current_student_class_name(), '-', 2),
    normalized_division,
    trim(target_title),
    trim(target_description),
    target_type,
    target_target_id,
    target_target_role,
    target_target_type,
    target_priority
  )
  returning * into created_row;

  return created_row;
end;
$$;

grant execute on function public.submit_complaint(text, text, text, text, text, text, text) to authenticated;
