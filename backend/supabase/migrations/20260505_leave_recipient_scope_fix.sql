update public.leave_requests
set recipient_type = 'Class Teacher'
where recipient_type = 'Subject Teacher';

alter table public.leave_requests
drop constraint if exists leave_requests_recipient_type_check;

alter table public.leave_requests
add constraint leave_requests_recipient_type_check
check (recipient_type in ('Class Teacher', 'Governing Body'));

drop policy if exists "leave_requests_insert_student" on public.leave_requests;

create policy "leave_requests_insert_student"
on public.leave_requests
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
  and class_name = public.current_student_class_name()
  and recipient_type in ('Class Teacher', 'Governing Body')
  and exists (
    select 1
    from public.profiles recipient_profile
    where recipient_profile.id = teacher_profile_id
      and recipient_profile.role in ('Teacher', 'Governing Body')
  )
);
