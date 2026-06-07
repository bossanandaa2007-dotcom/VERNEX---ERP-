drop policy if exists "complaints_update_staff" on public.complaints;

create policy "complaints_update_staff"
on public.complaints
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'Admin'
        or (
          p.role = 'Teacher'
          and public.complaints.target_role = 'Teacher'
          and public.complaints.target_id = auth.uid()::text
        )
        or (
          p.role = 'Governing Body'
          and public.complaints.target_role = 'Governing Body'
          and public.complaints.target_id = auth.uid()::text
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'Admin'
        or (
          p.role = 'Teacher'
          and public.complaints.target_role = 'Teacher'
          and public.complaints.target_id = auth.uid()::text
        )
        or (
          p.role = 'Governing Body'
          and public.complaints.target_role = 'Governing Body'
          and public.complaints.target_id = auth.uid()::text
        )
      )
  )
);
