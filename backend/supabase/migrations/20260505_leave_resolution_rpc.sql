create or replace function public.resolve_leave_request(
  target_request_id uuid,
  next_status text,
  next_remarks text default null
)
returns public.leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.leave_requests;
begin
  if next_status not in ('Approved', 'Rejected') then
    raise exception 'Invalid leave status: %', next_status;
  end if;

  if not exists (
    select 1
    from public.leave_requests lr
    where lr.id = target_request_id
      and (
        public.current_profile_role() in ('Admin', 'Governing Body')
        or lr.teacher_profile_id = auth.uid()
      )
  ) then
    raise exception 'You are not allowed to resolve this leave request.';
  end if;

  update public.leave_requests
  set
    status = next_status,
    teacher_remarks = nullif(trim(coalesce(next_remarks, '')), ''),
    updated_at = timezone('utc', now())
  where id = target_request_id
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Leave request not found.';
  end if;

  return updated_row;
end;
$$;

grant execute on function public.resolve_leave_request(uuid, text, text) to authenticated;
