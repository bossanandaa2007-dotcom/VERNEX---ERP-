create or replace function public.teacher_can_edit_attendance_date(target_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_date <= current_date
    and target_date >= current_date - 2
$$;

drop policy if exists "attendance_insert_home_class_teacher" on public.attendance_records;
drop policy if exists "attendance_update_home_class_teacher" on public.attendance_records;

create policy "attendance_insert_home_class_teacher"
on public.attendance_records
for insert
to authenticated
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(class_id)
    and public.teacher_can_edit_attendance_date(attendance_date)
  )
);

create policy "attendance_update_home_class_teacher"
on public.attendance_records
for update
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(public.attendance_records.class_id)
    and public.teacher_can_edit_attendance_date(public.attendance_records.attendance_date)
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_owns_attendance_class(class_id)
    and public.teacher_can_edit_attendance_date(attendance_date)
  )
);
