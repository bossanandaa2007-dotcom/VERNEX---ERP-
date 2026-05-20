alter table public.profiles
add column if not exists subjects text[] not null default '{}';

alter table public.teachers
add column if not exists subjects text[] not null default '{}';

update public.profiles
set subjects = case
  when coalesce(array_length(subjects, 1), 0) = 0 and subject is not null then array[subject]
  else subjects
end;

update public.teachers
set subjects = case
  when coalesce(array_length(subjects, 1), 0) = 0 and subject is not null then array[subject]
  else subjects
end;

alter table public.assignment_submissions
add column if not exists student_id uuid references public.profiles (id) on delete cascade;

update public.assignment_submissions submission
set student_id = p.id
from public.profiles p
where submission.student_id is null
  and lower(submission.student_email) = lower(p.email);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null,
  class_name text not null,
  roll_number text not null,
  teacher_profile_id uuid not null references public.profiles (id) on delete cascade,
  teacher_name text not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  teacher_remarks text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists leave_requests_student_idx on public.leave_requests (student_profile_id, created_at desc);
create index if not exists leave_requests_teacher_idx on public.leave_requests (teacher_profile_id, created_at desc);

alter table public.leave_requests enable row level security;

drop policy if exists "assignments_select_authenticated" on public.assignments;
drop policy if exists "assignments_manage_teacher_admin" on public.assignments;
drop policy if exists "assignment_submissions_select_authenticated" on public.assignment_submissions;
drop policy if exists "assignment_submissions_insert_authenticated" on public.assignment_submissions;
drop policy if exists "leave_requests_select_scoped" on public.leave_requests;
drop policy if exists "leave_requests_insert_student" on public.leave_requests;
drop policy if exists "leave_requests_update_teacher_admin" on public.leave_requests;

create policy "assignments_select_scoped"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or teacher_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and class_name = any(coalesce(p.classes, '{}'::text[]))
      and (
        p.subject is null
        or p.subject = subject
        or subject = any(coalesce(p.subjects, '{}'::text[]))
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Student'
      and p.class_name = class_name
  )
);

create policy "assignments_manage_teacher_admin"
on public.assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'Teacher'
        and class_name = any(coalesce(p.classes, '{}'::text[]))
        and (
          p.subject is null
          or p.subject = subject
          or subject = any(coalesce(p.subjects, '{}'::text[]))
        )
    )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'Teacher'
        and class_name = any(coalesce(p.classes, '{}'::text[]))
        and (
          p.subject is null
          or p.subject = subject
          or subject = any(coalesce(p.subjects, '{}'::text[]))
        )
    )
  )
);

create policy "assignment_submissions_select_scoped"
on public.assignment_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    where a.id = assignment_id
      and a.teacher_id = auth.uid()
  )
);

create policy "assignment_submissions_insert_student"
on public.assignment_submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    join public.profiles p on p.id = auth.uid()
    where a.id = assignment_id
      and p.role = 'Student'
      and p.class_name = a.class_name
  )
);

create policy "leave_requests_select_scoped"
on public.leave_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Governing Body')
  )
  or student_profile_id = auth.uid()
  or teacher_profile_id = auth.uid()
);

create policy "leave_requests_insert_student"
on public.leave_requests
for insert
to authenticated
with check (
  student_profile_id = auth.uid()
  and exists (
    select 1
    from public.profiles student_profile
    where student_profile.id = auth.uid()
      and student_profile.role = 'Student'
      and student_profile.class_name = class_name
  )
  and exists (
    select 1
    from public.profiles teacher_profile
    where teacher_profile.id = teacher_profile_id
      and teacher_profile.role = 'Teacher'
      and (
        class_name = any(coalesce(teacher_profile.classes, '{}'::text[]))
        or class_name = any(coalesce(teacher_profile.standards, '{}'::text[]))
      )
  )
);

create policy "leave_requests_update_teacher_admin"
on public.leave_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or teacher_profile_id = auth.uid()
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or teacher_profile_id = auth.uid()
);

insert into public.teachers (profile_id, category_id, name, subject, subjects, qualification, experience, contact, email, assigned_class, standards)
values
  (null, 'primary', 'Ms. Nandini Rao', 'English', '{"English","Social Studies"}', 'M.A, B.Ed', '8 years', '+91 980001007', 'nandini@school.edu', '4-A', '{"4-A","4-B","4-C","5-A","5-B","5-C"}'),
  (null, 'primary', 'Mr. Arvind Nair', 'Mathematics', '{"Mathematics","Science"}', 'B.Sc, B.Ed', '7 years', '+91 980001008', 'arvind@school.edu', '2-A', '{"2-A","2-B","2-C","3-A","3-B","3-C"}'),
  (null, 'secondary', 'Ms. Farah Khan', 'Science', '{"Science","Computer Science"}', 'M.Sc, B.Ed', '6 years', '+91 980001009', 'farah@school.edu', '8-A', '{"8-A","8-B","8-C"}'),
  (null, 'secondary', 'Mr. Dinesh Patel', 'Mathematics', '{"Mathematics","Physics"}', 'M.Sc, B.Ed', '10 years', '+91 980001010', 'dinesh@school.edu', '11-A', '{"11-A","11-B","11-C","12-A","12-B","12-C"}')
on conflict (email) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  subject = excluded.subject,
  subjects = excluded.subjects,
  qualification = excluded.qualification,
  experience = excluded.experience,
  contact = excluded.contact,
  assigned_class = excluded.assigned_class,
  standards = excluded.standards;

update public.teachers
set subjects = case
  when email = 'harikuuty@school.edu' then '{"Early Learning","Art","Rhymes"}'::text[]
  when email = 'srihari@school.edu' then '{"English","Mathematics","Science"}'::text[]
  when email = 'vivek@school.edu' then '{"English","Social Studies"}'::text[]
  when email = 'teacher@school.edu' then '{"Mathematics","Physics"}'::text[]
  when email = 'anjali@school.edu' then '{"Science","Chemistry"}'::text[]
  when email = 'kavya@school.edu' then '{"Computer Science","Mathematics"}'::text[]
  else subjects
end,
subject = case
  when coalesce(array_length(subjects, 1), 0) > 0 then subjects[1]
  else subject
end;

update public.profiles p
set
  name = t.name,
  role = 'Teacher',
  class_name = t.assigned_class,
  standards = t.standards,
  classes = t.standards,
  subject = t.subject,
  subjects = t.subjects
from public.teachers t
where p.id = t.profile_id;

insert into public.leave_requests (
  student_profile_id,
  student_name,
  class_name,
  roll_number,
  teacher_profile_id,
  teacher_name,
  start_date,
  end_date,
  reason,
  status,
  teacher_remarks
)
select
  student_profile.id,
  student_profile.name,
  student_profile.class_name,
  coalesce(student_row.roll_no, 'N/A'),
  teacher_profile.id,
  teacher_profile.name,
  current_date + 2,
  current_date + 3,
  'Medical appointment approved by parent.',
  'Pending',
  null
from public.profiles student_profile
join public.students student_row on student_row.profile_id = student_profile.id
join public.profiles teacher_profile on teacher_profile.email = 'teacher@school.edu'
where student_profile.email = 'student@school.edu'
  and not exists (
    select 1
    from public.leave_requests request
    where request.student_profile_id = student_profile.id
      and request.teacher_profile_id = teacher_profile.id
      and request.reason = 'Medical appointment approved by parent.'
  );
