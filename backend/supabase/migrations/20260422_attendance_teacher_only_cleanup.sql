delete from public.attendance_records
where coalesce((metadata ->> 'seeded')::boolean, false) = true;

drop policy if exists "attendance_insert_teacher_admin" on public.attendance_records;
drop policy if exists "attendance_update_teacher_admin" on public.attendance_records;
drop policy if exists "attendance_insert_teacher_only" on public.attendance_records;
drop policy if exists "attendance_update_teacher_only" on public.attendance_records;

create policy "attendance_insert_teacher_only"
on public.attendance_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
  )
);

create policy "attendance_update_teacher_only"
on public.attendance_records
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
  )
);
