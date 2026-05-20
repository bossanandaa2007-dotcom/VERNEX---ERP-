create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  teacher_profile_id uuid references public.profiles (id) on delete set null,
  subject_name text not null,
  day_of_week integer not null check (day_of_week between 1 and 6),
  period_number integer not null check (period_number between 1 and 8),
  start_time time,
  end_time time,
  room_number text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (section_id, day_of_week, period_number),
  unique (teacher_id, day_of_week, period_number)
);

create index if not exists timetable_entries_section_idx
on public.timetable_entries (section_id, day_of_week, period_number);

create index if not exists timetable_entries_teacher_idx
on public.timetable_entries (teacher_id, day_of_week, period_number);

alter table public.timetable_entries enable row level security;

create or replace function public.teacher_handles_timetable_subject(
  target_teacher_id uuid,
  target_section_id uuid,
  target_subject_name text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.teachers teacher
    where teacher.id = target_teacher_id
      and teacher.home_section_id = target_section_id
      and lower(trim(coalesce(teacher.home_section_subject, ''))) = lower(trim(target_subject_name))
  )
  or exists (
    select 1
    from public.section_teacher_assignments assignment
    where assignment.teacher_id = target_teacher_id
      and assignment.section_id = target_section_id
      and assignment.role = 'Subject Teacher'
      and lower(trim(assignment.subject)) = lower(trim(target_subject_name))
  );
$$;

create or replace function public.validate_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_subject text;
  resolved_teacher_profile_id uuid;
begin
  normalized_subject := public.normalize_subject_name(new.subject_name);

  if not exists (
    select 1
    from public.section_subjects subject
    where subject.section_id = new.section_id
      and lower(trim(subject.subject_name)) = lower(trim(normalized_subject))
  ) then
    raise exception 'Subject % is not configured for this section.', new.subject_name;
  end if;

  if not public.teacher_handles_timetable_subject(new.teacher_id, new.section_id, normalized_subject) then
    raise exception 'Selected teacher does not handle % for this section.', normalized_subject;
  end if;

  select teacher.profile_id
  into resolved_teacher_profile_id
  from public.teachers teacher
  where teacher.id = new.teacher_id;

  if resolved_teacher_profile_id is null then
    raise exception 'Selected teacher does not have a linked login profile.';
  end if;

  new.subject_name := normalized_subject;
  new.teacher_profile_id := resolved_teacher_profile_id;
  new.updated_at := timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists timetable_entries_validate_before_write on public.timetable_entries;
create trigger timetable_entries_validate_before_write
before insert or update on public.timetable_entries
for each row execute function public.validate_timetable_entry();

drop policy if exists "timetable_entries_select_scoped" on public.timetable_entries;
drop policy if exists "timetable_entries_manage_admin" on public.timetable_entries;

create policy "timetable_entries_select_scoped"
on public.timetable_entries
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or teacher_profile_id = auth.uid()
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.section_id = public.timetable_entries.section_id
  )
);

create policy "timetable_entries_manage_admin"
on public.timetable_entries
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');
