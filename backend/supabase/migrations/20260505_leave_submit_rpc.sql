create or replace function public.submit_leave_request(
  target_teacher_profile_id uuid,
  target_teacher_name text,
  target_recipient_type text,
  target_start_date date,
  target_end_date date,
  target_reason text
)
returns public.leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students;
  created_row public.leave_requests;
begin
  if public.current_profile_role() <> 'Student' then
    raise exception 'Only students can submit leave requests.';
  end if;

  if target_recipient_type not in ('Class Teacher', 'Governing Body') then
    raise exception 'Invalid leave recipient type: %', target_recipient_type;
  end if;

  if coalesce(trim(target_reason), '') = '' then
    raise exception 'Leave reason is required.';
  end if;

  if target_end_date < target_start_date then
    raise exception 'End date cannot be earlier than start date.';
  end if;

  select *
  into student_row
  from public.students
  where profile_id = auth.uid()
  limit 1;

  if student_row.id is null then
    raise exception 'Student record not found for this account.';
  end if;

  if not exists (
    select 1
    from public.profiles recipient_profile
    where recipient_profile.id = target_teacher_profile_id
      and recipient_profile.role = case
        when target_recipient_type = 'Governing Body' then 'Governing Body'
        else 'Teacher'
      end
  ) then
    raise exception 'Selected recipient is not valid for leave routing.';
  end if;

  insert into public.leave_requests (
    student_profile_id,
    student_name,
    class_name,
    roll_number,
    teacher_profile_id,
    teacher_name,
    recipient_type,
    start_date,
    end_date,
    reason
  )
  values (
    auth.uid(),
    student_row.name,
    public.current_student_class_name(),
    student_row.roll_no,
    target_teacher_profile_id,
    target_teacher_name,
    target_recipient_type,
    target_start_date,
    target_end_date,
    trim(target_reason)
  )
  returning * into created_row;

  return created_row;
end;
$$;

grant execute on function public.submit_leave_request(uuid, text, text, date, date, text) to authenticated;
