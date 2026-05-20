create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('Admin', 'Teacher', 'Student', 'Accountant', 'Governing Body')),
  standard text,
  class_name text,
  section text,
  standards text[] default '{}',
  classes text[] default '{}',
  subject text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.complaints (
  id text primary key default concat('cmp-', replace(gen_random_uuid()::text, '-', '')),
  student_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null,
  class_name text not null,
  section text not null,
  division text not null check (division in ('Boys', 'Girls')),
  title text not null,
  description text not null,
  type text not null check (type in ('Academic', 'Infrastructure', 'Discipline', 'Hostel', 'Other')),
  target_id text not null,
  target_role text not null check (target_role in ('Teacher', 'Governing Body', 'Unknown')),
  priority text not null check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  response text,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  section_id text not null,
  class_id text not null,
  attendance_date date not null,
  student_id text not null,
  student_name text not null,
  status text not null check (status in ('Present', 'Absent')),
  source text not null check (source in ('AI', 'Manual')),
  confidence_score numeric(4, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.attendance_records enable row level security;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "complaints_insert_student"
on public.complaints
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Student'
  )
);

create policy "complaints_select_student_or_staff"
on public.complaints
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'Admin'
        or (p.role = 'Teacher' and complaints.target_role = 'Teacher')
        or (p.role = 'Governing Body' and complaints.target_role = 'Governing Body')
      )
  )
);

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
        or (p.role = 'Teacher' and complaints.target_role = 'Teacher')
        or (p.role = 'Governing Body' and complaints.target_role = 'Governing Body')
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
        or (p.role = 'Teacher' and complaints.target_role = 'Teacher')
        or (p.role = 'Governing Body' and complaints.target_role = 'Governing Body')
      )
  )
);

create policy "attendance_select_authenticated"
on public.attendance_records
for select
to authenticated
using (true);

create policy "attendance_insert_teacher_admin"
on public.attendance_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Teacher')
  )
);
