create table if not exists public.section_teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  teacher_profile_id uuid references public.profiles (id) on delete set null,
  role text not null check (role in ('Class Teacher', 'Subject Teacher')),
  subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (section_id, teacher_id, role, subject)
);

create index if not exists section_teacher_assignments_section_idx
on public.section_teacher_assignments (section_id, role);

create index if not exists section_teacher_assignments_profile_idx
on public.section_teacher_assignments (teacher_profile_id);

alter table public.section_teacher_assignments enable row level security;

drop policy if exists "section_teacher_assignments_select_authenticated" on public.section_teacher_assignments;
drop policy if exists "section_teacher_assignments_manage_admin" on public.section_teacher_assignments;

create policy "section_teacher_assignments_select_authenticated"
on public.section_teacher_assignments
for select
to authenticated
using (true);

create policy "section_teacher_assignments_manage_admin"
on public.section_teacher_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
);

alter table public.leave_requests
add column if not exists recipient_type text not null default 'Class Teacher'
check (recipient_type in ('Class Teacher', 'Subject Teacher', 'Governing Body'));

alter table public.complaints
add column if not exists target_type text
check (target_type in ('Class Teacher', 'Subject Teacher', 'Governing Body'));

update public.leave_requests
set recipient_type = coalesce(recipient_type, 'Class Teacher');

update public.complaints
set target_type = coalesce(
  target_type,
  case
    when target_role = 'Governing Body' then 'Governing Body'
    else 'Class Teacher'
  end
);

drop policy if exists "leave_requests_select_scoped" on public.leave_requests;
drop policy if exists "leave_requests_insert_student" on public.leave_requests;
drop policy if exists "leave_requests_update_teacher_admin" on public.leave_requests;

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
    from public.profiles recipient_profile
    where recipient_profile.id = teacher_profile_id
      and recipient_profile.role in ('Teacher', 'Governing Body')
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
      and p.role in ('Admin', 'Governing Body')
  )
  or teacher_profile_id = auth.uid()
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Governing Body')
  )
  or teacher_profile_id = auth.uid()
);

drop policy if exists "complaints_select_student_or_staff" on public.complaints;
drop policy if exists "complaints_update_staff" on public.complaints;

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
        or (p.role in ('Teacher', 'Governing Body') and public.complaints.target_id = auth.uid()::text)
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
        or (p.role in ('Teacher', 'Governing Body') and public.complaints.target_id = auth.uid()::text)
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
        or (p.role in ('Teacher', 'Governing Body') and public.complaints.target_id = auth.uid()::text)
      )
  )
);

update public.teachers
set
  subject = case
    when email = 'harikuuty@school.edu' then 'Early Learning'
    when email = 'srihari@school.edu' then 'Tamil'
    when email = 'vivek@school.edu' then 'Tamil'
    when email = 'teacher@school.edu' then 'Mathematics'
    when email = 'anjali@school.edu' then 'Science'
    when email = 'kavya@school.edu' then 'Computer Science'
    when email = 'nandini@school.edu' then 'English'
    when email = 'arvind@school.edu' then 'Mathematics'
    when email = 'farah@school.edu' then 'Physics'
    when email = 'dinesh@school.edu' then 'Mathematics'
    else subject
  end,
  subjects = case
    when email = 'harikuuty@school.edu' then '{"Early Learning","Art","Rhymes"}'::text[]
    when email = 'srihari@school.edu' then '{"Tamil","French","Primary Language"}'::text[]
    when email = 'vivek@school.edu' then '{"Tamil","English","Social","Hindi"}'::text[]
    when email = 'teacher@school.edu' then '{"Mathematics","Science"}'::text[]
    when email = 'anjali@school.edu' then '{"Science","Social","Chemistry"}'::text[]
    when email = 'kavya@school.edu' then '{"Computer Science","Computer Application","Commerce","Economics","Business"}'::text[]
    when email = 'nandini@school.edu' then '{"English","Social","French"}'::text[]
    when email = 'arvind@school.edu' then '{"Mathematics","Science"}'::text[]
    when email = 'farah@school.edu' then '{"Physics","Chemistry","Botany","Zoology","Science"}'::text[]
    when email = 'dinesh@school.edu' then '{"Mathematics","Physics","Computer Science"}'::text[]
    else subjects
  end,
  standards = case
    when email = 'harikuuty@school.edu' then '{"LKG-A","LKG-B","LKG-C","UKG-A","UKG-B","UKG-C"}'::text[]
    when email = 'srihari@school.edu' then '{"1-A","1-B","1-C","2-A","2-B","2-C","3-A","3-B","3-C","4-A","4-B","4-C","5-A","5-B","5-C","11-C","12-C"}'::text[]
    when email = 'vivek@school.edu' then '{"1-A","1-B","1-C","2-A","2-B","2-C","3-A","3-B","3-C","4-A","4-B","4-C","5-A","5-B","5-C","6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-B","12-B"}'::text[]
    when email = 'teacher@school.edu' then '{"6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C"}'::text[]
    when email = 'anjali@school.edu' then '{"6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-B","12-B"}'::text[]
    when email = 'kavya@school.edu' then '{"8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-A","11-C","12-A","12-C"}'::text[]
    when email = 'nandini@school.edu' then '{"1-A","1-B","1-C","2-A","2-B","2-C","3-A","3-B","3-C","4-A","4-B","4-C","5-A","5-B","5-C","6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-A","11-B","11-C","12-A","12-B","12-C"}'::text[]
    when email = 'arvind@school.edu' then '{"1-A","1-B","1-C","2-A","2-B","2-C","3-A","3-B","3-C","4-A","4-B","4-C","5-A","5-B","5-C"}'::text[]
    when email = 'farah@school.edu' then '{"8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-A","11-B","12-A","12-B"}'::text[]
    when email = 'dinesh@school.edu' then '{"6-A","6-B","6-C","7-A","7-B","7-C","8-A","8-B","8-C","9-A","9-B","9-C","10-A","10-B","10-C","11-A","11-B","11-C","12-A","12-B","12-C"}'::text[]
    else standards
  end
where email in (
  'harikuuty@school.edu',
  'srihari@school.edu',
  'vivek@school.edu',
  'teacher@school.edu',
  'anjali@school.edu',
  'kavya@school.edu',
  'nandini@school.edu',
  'arvind@school.edu',
  'farah@school.edu',
  'dinesh@school.edu'
);

update public.profiles p
set
  class_name = t.assigned_class,
  standards = t.standards,
  classes = t.standards,
  subject = t.subject,
  subjects = t.subjects
from public.teachers t
where p.id = t.profile_id;

with section_targets as (
  select
    s.id,
    s.name,
    case
      when split_part(s.name, '-', 1) in ('LKG', 'UKG') then 'harikuuty'
      when split_part(s.name, '-', 1) in ('1', '2', '3', '4', '5') and split_part(s.name, '-', 2) = 'A' then 'srihari'
      when split_part(s.name, '-', 1) in ('1', '2', '3', '4', '5') and split_part(s.name, '-', 2) = 'B' then 'Ms. Nandini Rao'
      when split_part(s.name, '-', 1) in ('1', '2', '3', '4', '5') and split_part(s.name, '-', 2) = 'C' then 'Mr. Arvind Nair'
      when split_part(s.name, '-', 1) in ('6', '7', '8') and split_part(s.name, '-', 2) = 'A' then 'Mr. Vivek Sharma'
      when split_part(s.name, '-', 1) in ('6', '7', '8') and split_part(s.name, '-', 2) = 'B' then 'Mr. Rajesh Kumar'
      when split_part(s.name, '-', 1) in ('6', '7', '8') and split_part(s.name, '-', 2) = 'C' then 'Ms. Anjali Mehta'
      when split_part(s.name, '-', 1) in ('9', '10') and split_part(s.name, '-', 2) = 'A' then 'Mr. Dinesh Patel'
      when split_part(s.name, '-', 1) in ('9', '10') and split_part(s.name, '-', 2) = 'B' then 'Mr. Vivek Sharma'
      when split_part(s.name, '-', 1) in ('9', '10') and split_part(s.name, '-', 2) = 'C' then 'Ms. Anjali Mehta'
      when split_part(s.name, '-', 1) in ('11', '12') and split_part(s.name, '-', 2) = 'A' then 'Mr. Dinesh Patel'
      when split_part(s.name, '-', 1) in ('11', '12') and split_part(s.name, '-', 2) = 'B' then 'Ms. Farah Khan'
      when split_part(s.name, '-', 1) in ('11', '12') and split_part(s.name, '-', 2) = 'C' then 'Ms. Kavya R'
      else s.class_teacher
    end as class_teacher
  from public.sections s
)
update public.sections s
set class_teacher = st.class_teacher
from section_targets st
where s.id = st.id;

delete from public.section_teacher_assignments;

with section_meta as (
  select
    s.id as section_id,
    s.name as section_name,
    s.class_teacher,
    split_part(s.name, '-', 1) as standard_label,
    split_part(s.name, '-', 2) as section_letter
  from public.sections s
),
class_teacher_rows as (
  select
    sm.section_id,
    t.id as teacher_id,
    t.profile_id as teacher_profile_id,
    'Class Teacher'::text as role,
    'Class Teacher'::text as subject
  from section_meta sm
  join public.teachers t on t.name = sm.class_teacher
  where t.profile_id is not null
),
subject_rows as (
  select
    sm.section_id,
    subject_name,
    case
      when sm.standard_label in ('1','2','3','4','5') and subject_name = 'Tamil' then 'srihari'
      when sm.standard_label in ('1','2','3','4','5') and subject_name = 'English' then 'Ms. Nandini Rao'
      when sm.standard_label in ('1','2','3','4','5') and subject_name = 'Math' then 'Mr. Arvind Nair'
      when sm.standard_label in ('1','2','3','4','5') and subject_name = 'Science' then 'Mr. Arvind Nair'
      when sm.standard_label in ('1','2','3','4','5') and subject_name = 'Social' then 'Mr. Vivek Sharma'
      when sm.standard_label in ('6','7','8','9','10') and subject_name = 'Tamil' then 'Mr. Vivek Sharma'
      when sm.standard_label in ('6','7','8','9','10') and subject_name = 'English' then 'Ms. Nandini Rao'
      when sm.standard_label in ('6','7','8','9','10') and subject_name = 'Math' then 'Mr. Dinesh Patel'
      when sm.standard_label in ('6','7','8','9','10') and subject_name = 'Science' then 'Ms. Anjali Mehta'
      when sm.standard_label in ('6','7','8','9','10') and subject_name = 'Social' then 'Mr. Vivek Sharma'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'Physics' then 'Mr. Dinesh Patel'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'Chemistry' then 'Ms. Farah Khan'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'Math' then 'Mr. Dinesh Patel'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'Computer Science' then 'Ms. Kavya R'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'English' then 'Ms. Nandini Rao'
      when sm.standard_label in ('11','12') and sm.section_letter = 'A' and subject_name = 'Tamil' then 'srihari'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Physics' then 'Ms. Farah Khan'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Chemistry' then 'Ms. Anjali Mehta'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Math' then 'Mr. Dinesh Patel'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Botany' then 'Ms. Farah Khan'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Zoology' then 'Ms. Farah Khan'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'English' then 'Ms. Nandini Rao'
      when sm.standard_label in ('11','12') and sm.section_letter = 'B' and subject_name = 'Hindi' then 'Mr. Vivek Sharma'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'Business' then 'Ms. Kavya R'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'Math' then 'Mr. Dinesh Patel'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'Commerce' then 'Ms. Kavya R'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'Economics' then 'Ms. Kavya R'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'Computer Application' then 'Ms. Kavya R'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'English' then 'Ms. Nandini Rao'
      when sm.standard_label in ('11','12') and sm.section_letter = 'C' and subject_name = 'French' then 'srihari'
      else null
    end as teacher_name
  from section_meta sm
  cross join lateral (
    select unnest(
      case
        when sm.standard_label in ('1','2','3','4','5') then array['Tamil','English','Math','Science','Social']
        when sm.standard_label in ('6','7','8','9','10') then array['Tamil','English','Math','Science','Social']
        when sm.standard_label in ('11','12') and sm.section_letter = 'A' then array['Physics','Chemistry','Math','Computer Science','English','Tamil']
        when sm.standard_label in ('11','12') and sm.section_letter = 'B' then array['Physics','Chemistry','Math','Botany','Zoology','English','Hindi']
        when sm.standard_label in ('11','12') and sm.section_letter = 'C' then array['Business','Math','Commerce','Economics','Computer Application','English','French']
        else array[]::text[]
      end
    ) as subject_name
  ) subjects
),
subject_teacher_rows as (
  select
    sr.section_id,
    t.id as teacher_id,
    t.profile_id as teacher_profile_id,
    'Subject Teacher'::text as role,
    sr.subject_name as subject
  from subject_rows sr
  join public.teachers t on t.name = sr.teacher_name
  where sr.teacher_name is not null
    and t.profile_id is not null
)
insert into public.section_teacher_assignments (section_id, teacher_id, teacher_profile_id, role, subject)
select *
from (
  select * from class_teacher_rows
  union all
  select * from subject_teacher_rows
) assignments;
