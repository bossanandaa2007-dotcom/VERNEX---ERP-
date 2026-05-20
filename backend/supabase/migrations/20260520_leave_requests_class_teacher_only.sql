update public.leave_requests lr
set
  teacher_profile_id = class_teacher.profile_id,
  teacher_name = class_teacher.name,
  recipient_type = 'Class Teacher',
  updated_at = timezone('utc', now())
from public.students student_row
join public.teachers class_teacher on class_teacher.home_section_id = student_row.section_id
where lr.student_profile_id = student_row.profile_id
  and (
    lr.recipient_type <> 'Class Teacher'
    or lr.teacher_profile_id is distinct from class_teacher.profile_id
  )
  and class_teacher.profile_id is not null;

alter table public.leave_requests
drop constraint if exists leave_requests_recipient_type_check;

alter table public.leave_requests
add constraint leave_requests_recipient_type_check
check (recipient_type = 'Class Teacher');

drop policy if exists "leave_requests_insert_student" on public.leave_requests;

create policy "leave_requests_insert_student"
on public.leave_requests
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
  and class_name = public.current_student_class_name()
  and recipient_type = 'Class Teacher'
  and exists (
    select 1
    from public.students student_row
    join public.teachers class_teacher on class_teacher.home_section_id = student_row.section_id
    where student_row.profile_id = auth.uid()
      and class_teacher.profile_id = teacher_profile_id
  )
);

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
  class_teacher_row public.teachers;
  created_row public.leave_requests;
begin
  if public.current_profile_role() <> 'Student' then
    raise exception 'Only students can submit leave requests.';
  end if;

  if target_recipient_type <> 'Class Teacher' then
    raise exception 'Leave requests can only be sent to your assigned class teacher.';
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

  select *
  into class_teacher_row
  from public.teachers
  where home_section_id = student_row.section_id
    and profile_id = target_teacher_profile_id
  limit 1;

  if class_teacher_row.id is null or class_teacher_row.profile_id is null then
    raise exception 'Selected teacher is not assigned to your class.';
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
    class_teacher_row.profile_id,
    class_teacher_row.name,
    'Class Teacher',
    target_start_date,
    target_end_date,
    trim(target_reason)
  )
  returning * into created_row;

  return created_row;
end;
$$;

grant execute on function public.submit_leave_request(uuid, text, text, date, date, text) to authenticated;
