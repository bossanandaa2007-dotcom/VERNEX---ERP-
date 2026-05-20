create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  recipient_role text not null,
  student_id uuid references public.students (id) on delete cascade,
  fee_record_id uuid,
  notification_type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_recipient_idx
on public.notifications (recipient_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_recipient_or_staff" on public.notifications;
create policy "notifications_select_recipient_or_staff"
on public.notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  or public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body', 'Librarian')
);

drop policy if exists "notifications_update_read_own" on public.notifications;
create policy "notifications_update_read_own"
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
