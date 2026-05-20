create table if not exists public.class_exam_mark_locks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  exam_type text not null check (exam_type in ('Quarterly', 'Half Yearly', 'Annual')),
  locked_by uuid references public.profiles (id) on delete set null,
  locked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id, exam_type)
);

create index if not exists class_exam_mark_locks_section_exam_idx
on public.class_exam_mark_locks (section_id, exam_type);

alter table public.class_exam_mark_locks enable row level security;

create or replace function public.is_class_exam_marks_locked(target_section_id uuid, target_exam_type text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.class_exam_mark_locks mark_lock
    where mark_lock.section_id = target_section_id
      and mark_lock.exam_type = target_exam_type
  );
$$;

create or replace function public.prevent_teacher_mark_changes_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_section_id uuid;
  target_exam_type text;
begin
  if public.current_profile_role() <> 'Teacher' then
    return coalesce(new, old);
  end if;

  target_section_id := coalesce(new.section_id, old.section_id);
  target_exam_type := coalesce(new.exam_type, old.exam_type);

  if public.is_class_exam_marks_locked(target_section_id, target_exam_type) then
    raise exception 'Marks are locked for this class and exam.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists student_marks_prevent_teacher_changes_when_locked on public.student_marks;
create trigger student_marks_prevent_teacher_changes_when_locked
before insert or update or delete on public.student_marks
for each row execute function public.prevent_teacher_mark_changes_when_locked();

drop policy if exists "class_exam_mark_locks_select_scoped" on public.class_exam_mark_locks;
drop policy if exists "class_exam_mark_locks_manage_admin" on public.class_exam_mark_locks;

create policy "class_exam_mark_locks_select_scoped"
on public.class_exam_mark_locks
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.section_id = public.class_exam_mark_locks.section_id
  )
  or exists (
    select 1
    from public.teachers teacher
    where teacher.profile_id = auth.uid()
      and teacher.home_section_id = public.class_exam_mark_locks.section_id
  )
  or exists (
    select 1
    from public.section_teacher_assignments assignment
    where assignment.teacher_profile_id = auth.uid()
      and assignment.section_id = public.class_exam_mark_locks.section_id
  )
);

create policy "class_exam_mark_locks_manage_admin"
on public.class_exam_mark_locks
for all
to authenticated
using (public.current_profile_role() = 'Admin')
with check (public.current_profile_role() = 'Admin');
