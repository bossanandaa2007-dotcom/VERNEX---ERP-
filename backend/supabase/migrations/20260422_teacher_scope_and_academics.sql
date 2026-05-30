create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.class_categories (id) on delete cascade,
  name text not null,
  code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (category_id, name)
);

create table if not exists public.student_marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  student_name text not null,
  section_id uuid not null references public.sections (id) on delete cascade,
  class_name text not null,
  subject_name text not null,
  exam_type text not null check (exam_type in ('Quarterly', 'Half Yearly', 'Annual')),
  marks integer not null check (marks >= 0),
  max_marks integer not null default 100 check (max_marks > 0),
  teacher_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (student_id, subject_name, exam_type)
);

create index if not exists subjects_category_idx on public.subjects (category_id, sort_order);
create index if not exists student_marks_class_exam_idx on public.student_marks (class_name, exam_type);
create index if not exists student_marks_student_idx on public.student_marks (student_id);

alter table public.subjects enable row level security;
alter table public.student_marks enable row level security;

drop policy if exists "subjects_select_authenticated" on public.subjects;
drop policy if exists "subjects_manage_admin" on public.subjects;
drop policy if exists "student_marks_select_scoped" on public.student_marks;
drop policy if exists "student_marks_insert_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_update_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_delete_teacher_admin" on public.student_marks;

create policy "subjects_select_authenticated"
on public.subjects
for select
to authenticated
using (true);

create policy "subjects_manage_admin"
on public.subjects
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

drop policy if exists "sections_select_authenticated" on public.sections;
drop policy if exists "teachers_select_authenticated" on public.teachers;
drop policy if exists "students_select_authenticated" on public.students;
drop policy if exists "school_directory_manage_admin" on public.sections;
drop policy if exists "teachers_manage_admin" on public.teachers;
drop policy if exists "students_manage_admin" on public.students;
drop policy if exists "sections_select_scoped" on public.sections;
drop policy if exists "teachers_select_scoped" on public.teachers;
drop policy if exists "students_select_scoped" on public.students;
drop policy if exists "sections_manage_admin" on public.sections;
drop policy if exists "sections_update_teacher_scope" on public.sections;
drop policy if exists "teachers_manage_admin" on public.teachers;
drop policy if exists "students_manage_admin" on public.students;
drop policy if exists "students_insert_teacher_scope" on public.students;
drop policy if exists "students_update_teacher_scope" on public.students;
drop policy if exists "students_delete_teacher_scope" on public.students;

create policy "sections_select_scoped"
on public.sections
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.sections.name = any(coalesce(p.classes, '{}'::text[]))
        or public.sections.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
  or exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.section_id = public.sections.id
  )
);

create policy "teachers_select_scoped"
on public.teachers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or public.teachers.profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.teachers.assigned_class = any(coalesce(p.classes, '{}'::text[]))
        or public.teachers.assigned_class = any(coalesce(p.standards, '{}'::text[]))
        or public.teachers.standards && coalesce(p.classes, '{}'::text[])
        or public.teachers.standards && coalesce(p.standards, '{}'::text[])
      )
  )
);

create policy "students_select_scoped"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or public.students.profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = public.students.section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "sections_manage_admin"
on public.sections
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

create policy "sections_update_teacher_scope"
on public.sections
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.sections.name = any(coalesce(p.classes, '{}'::text[]))
        or public.sections.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.sections.name = any(coalesce(p.classes, '{}'::text[]))
        or public.sections.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "teachers_manage_admin"
on public.teachers
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

create policy "students_manage_admin"
on public.students
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

create policy "students_insert_teacher_scope"
on public.students
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "students_update_teacher_scope"
on public.students
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = public.students.section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "students_delete_teacher_scope"
on public.students
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.sections sec on sec.id = public.students.section_id
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        sec.name = any(coalesce(p.classes, '{}'::text[]))
        or sec.name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
);

create policy "student_marks_select_scoped"
on public.student_marks
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Accountant', 'Governing Body')
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.student_marks.class_name = any(coalesce(p.classes, '{}'::text[]))
        or public.student_marks.class_name = any(coalesce(p.standards, '{}'::text[]))
      )
  )
  or exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.id = public.student_marks.student_id
  )
);

create policy "student_marks_insert_teacher_admin"
on public.student_marks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        class_name = any(coalesce(p.classes, '{}'::text[]))
        or class_name = any(coalesce(p.standards, '{}'::text[]))
      )
      and (
        p.subject is null
        or p.subject = subject_name
      )
  )
);

create policy "student_marks_update_teacher_admin"
on public.student_marks
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.student_marks.class_name = any(coalesce(p.classes, '{}'::text[]))
        or public.student_marks.class_name = any(coalesce(p.standards, '{}'::text[]))
      )
      and (
        p.subject is null
        or p.subject = public.student_marks.subject_name
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
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        class_name = any(coalesce(p.classes, '{}'::text[]))
        or class_name = any(coalesce(p.standards, '{}'::text[]))
      )
      and (
        p.subject is null
        or p.subject = subject_name
      )
  )
);

create policy "student_marks_delete_teacher_admin"
on public.student_marks
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Admin'
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Teacher'
      and (
        public.student_marks.class_name = any(coalesce(p.classes, '{}'::text[]))
        or public.student_marks.class_name = any(coalesce(p.standards, '{}'::text[]))
      )
      and (
        p.subject is null
        or p.subject = public.student_marks.subject_name
      )
  )
);

insert into public.teachers (profile_id, category_id, name, subject, qualification, experience, contact, email, assigned_class, standards)
values
  ((select id from public.profiles where email = 'harikuuty@school.edu'), 'kindergarten', 'harikuuty', 'Early Learning', 'B.Ed (ECE)', '6 years', '+91 980001005', 'harikuuty@school.edu', 'LKG-A', '{"LKG-A","LKG-B","LKG-C","UKG-A","UKG-B","UKG-C"}'),
  ((select id from public.profiles where email = 'srihari@school.edu'), 'primary', 'srihari', 'Primary Skills', 'M.A, B.Ed', '7 years', '+91 980001006', 'srihari@school.edu', '1-A', '{"1-A","1-B","1-C","2-A","2-B","2-C","3-A","3-B","3-C","4-A","4-B","4-C","5-A","5-B","5-C"}'),
  ((select id from public.profiles where email = 'vivek@school.edu'), 'secondary', 'Mr. Vivek Sharma', 'English', 'M.A, B.Ed', '9 years', '+91 980001003', 'vivek@school.edu', '6-A', '{"6-A","6-B","6-C","7-A","7-B","7-C"}'),
  ((select id from public.profiles where email = 'teacher@school.edu'), 'secondary', 'Mr. Rajesh Kumar', 'Mathematics', 'M.Sc, B.Ed', '8 years', '+91 980001001', 'teacher@school.edu', '8-A', '{"8-A","8-B","8-C","9-A","9-B","9-C"}'),
  ((select id from public.profiles where email = 'anjali@school.edu'), 'secondary', 'Ms. Anjali Mehta', 'Science', 'M.Sc, B.Ed', '6 years', '+91 980001002', 'anjali@school.edu', '10-A', '{"10-A","10-B","10-C","11-A","11-B","11-C"}'),
  ((select id from public.profiles where email = 'kavya@school.edu'), 'higher-secondary', 'Ms. Kavya R', 'Computer Science', 'M.Tech, B.Ed', '5 years', '+91 980001004', 'kavya@school.edu', '12-A', '{"12-A","12-B","12-C"}')
on conflict (email) do update set
  profile_id = excluded.profile_id,
  category_id = excluded.category_id,
  name = excluded.name,
  subject = excluded.subject,
  qualification = excluded.qualification,
  experience = excluded.experience,
  contact = excluded.contact,
  assigned_class = excluded.assigned_class,
  standards = excluded.standards;

update public.profiles p
set
  name = t.name,
  email = t.email,
  role = 'Teacher',
  class_name = t.assigned_class,
  standards = t.standards,
  classes = t.standards,
  subject = t.subject
from public.teachers t
where p.id = t.profile_id;

with desired_sections(category_id, name, class_teacher, room_number) as (
  values
    ('kindergarten', 'LKG-A', 'harikuuty', 'KG-101'),
    ('kindergarten', 'LKG-B', 'harikuuty', 'KG-102'),
    ('kindergarten', 'LKG-C', 'harikuuty', 'KG-103'),
    ('kindergarten', 'UKG-A', 'harikuuty', 'KG-201'),
    ('kindergarten', 'UKG-B', 'harikuuty', 'KG-202'),
    ('kindergarten', 'UKG-C', 'harikuuty', 'KG-203'),
    ('primary', '1-A', 'srihari', 'P-101'),
    ('primary', '1-B', 'srihari', 'P-102'),
    ('primary', '1-C', 'srihari', 'P-103'),
    ('primary', '2-A', 'srihari', 'P-201'),
    ('primary', '2-B', 'srihari', 'P-202'),
    ('primary', '2-C', 'srihari', 'P-203'),
    ('primary', '3-A', 'srihari', 'P-301'),
    ('primary', '3-B', 'srihari', 'P-302'),
    ('primary', '3-C', 'srihari', 'P-303'),
    ('primary', '4-A', 'srihari', 'P-401'),
    ('primary', '4-B', 'srihari', 'P-402'),
    ('primary', '4-C', 'srihari', 'P-403'),
    ('primary', '5-A', 'srihari', 'P-501'),
    ('primary', '5-B', 'srihari', 'P-502'),
    ('primary', '5-C', 'srihari', 'P-503'),
    ('secondary', '6-A', 'Mr. Vivek Sharma', 'S-101'),
    ('secondary', '6-B', 'Mr. Vivek Sharma', 'S-102'),
    ('secondary', '6-C', 'Mr. Vivek Sharma', 'S-103'),
    ('secondary', '7-A', 'Mr. Vivek Sharma', 'S-201'),
    ('secondary', '7-B', 'Mr. Vivek Sharma', 'S-202'),
    ('secondary', '7-C', 'Mr. Vivek Sharma', 'S-203'),
    ('secondary', '8-A', 'Mr. Rajesh Kumar', 'S-301'),
    ('secondary', '8-B', 'Mr. Rajesh Kumar', 'S-302'),
    ('secondary', '8-C', 'Mr. Rajesh Kumar', 'S-303'),
    ('secondary', '9-A', 'Mr. Rajesh Kumar', 'S-401'),
    ('secondary', '9-B', 'Mr. Rajesh Kumar', 'S-402'),
    ('secondary', '9-C', 'Mr. Rajesh Kumar', 'S-403'),
    ('secondary', '10-A', 'Ms. Anjali Mehta', 'S-501'),
    ('secondary', '10-B', 'Ms. Anjali Mehta', 'S-502'),
    ('secondary', '10-C', 'Ms. Anjali Mehta', 'S-503'),
    ('higher-secondary', '11-A', 'Ms. Anjali Mehta', 'HS-101'),
    ('higher-secondary', '11-B', 'Ms. Anjali Mehta', 'HS-102'),
    ('higher-secondary', '11-C', 'Ms. Anjali Mehta', 'HS-103'),
    ('higher-secondary', '12-A', 'Ms. Kavya R', 'HS-201'),
    ('higher-secondary', '12-B', 'Ms. Kavya R', 'HS-202'),
    ('higher-secondary', '12-C', 'Ms. Kavya R', 'HS-203')
)
insert into public.sections (category_id, name, class_teacher, strength, room_number)
select category_id, name, class_teacher, 10, room_number
from desired_sections
on conflict (name) do update set
  category_id = excluded.category_id,
  class_teacher = excluded.class_teacher,
  strength = excluded.strength,
  room_number = excluded.room_number;

insert into public.subjects (category_id, name, code, sort_order)
values
  ('kindergarten', 'English', 'ENG', 1),
  ('kindergarten', 'Mathematics', 'MATH', 2),
  ('kindergarten', 'EVS', 'EVS', 3),
  ('kindergarten', 'Art', 'ART', 4),
  ('kindergarten', 'Rhymes', 'RHY', 5),
  ('primary', 'English', 'ENG', 1),
  ('primary', 'Mathematics', 'MATH', 2),
  ('primary', 'Science', 'SCI', 3),
  ('primary', 'Social Studies', 'SST', 4),
  ('primary', 'Computer Science', 'CS', 5),
  ('secondary', 'English', 'ENG', 1),
  ('secondary', 'Mathematics', 'MATH', 2),
  ('secondary', 'Science', 'SCI', 3),
  ('secondary', 'Social Studies', 'SST', 4),
  ('secondary', 'Computer Science', 'CS', 5),
  ('higher-secondary', 'English', 'ENG', 1),
  ('higher-secondary', 'Mathematics', 'MATH', 2),
  ('higher-secondary', 'Physics', 'PHY', 3),
  ('higher-secondary', 'Chemistry', 'CHE', 4),
  ('higher-secondary', 'Computer Science', 'CS', 5)
on conflict (category_id, name) do update set
  code = excluded.code,
  sort_order = excluded.sort_order;

with section_catalog as (
  select
    s.id as section_id,
    s.category_id,
    s.name as section_name,
    regexp_replace(split_part(s.name, '-', 1), '[^A-Za-z0-9]', '', 'g') as class_label,
    split_part(s.name, '-', 2) as section_letter
  from public.sections s
),
student_slots as (
  select
    sc.section_id,
    sc.category_id,
    sc.section_name,
    sc.class_label,
    sc.section_letter,
    gs.slot_no
  from section_catalog sc
  join lateral generate_series(
    coalesce((select count(*) from public.students st where st.section_id = sc.section_id), 0) + 1,
    10
  ) as gs(slot_no) on true
)
insert into public.students (
  profile_id,
  category_id,
  section_id,
  name,
  email,
  roll_no,
  gender,
  dob,
  contact,
  parent_name,
  parent_contact,
  address
)
select
  null,
  ss.category_id,
  ss.section_id,
  concat('Student ', ss.class_label, ss.section_letter, ' ', lpad(ss.slot_no::text, 2, '0')),
  concat(lower(ss.class_label), lower(ss.section_letter), lpad(ss.slot_no::text, 2, '0'), '@school.edu'),
  concat(lower(ss.class_label), lower(ss.section_letter), lpad(ss.slot_no::text, 2, '0')),
  case when ss.slot_no % 2 = 0 then 'Female' else 'Male' end,
  case
    when ss.category_id = 'kindergarten' then make_date(2020, 6, least(28, 5 + ss.slot_no)::integer)
    when ss.category_id = 'primary' then make_date(2015, 6, least(28, 5 + ss.slot_no)::integer)
    when ss.category_id = 'secondary' then make_date(2010, 6, least(28, 5 + ss.slot_no)::integer)
    else make_date(2008, 6, least(28, 5 + ss.slot_no)::integer)
  end,
  concat('+91 91', lpad((1000000 + (ascii(left(ss.section_name, 1)) * 1000) + ss.slot_no * 17)::text, 7, '0')),
  concat('Parent ', ss.class_label, ss.section_letter, ' ', lpad(ss.slot_no::text, 2, '0')),
  concat('+91 92', lpad((1000000 + (ascii(right(ss.section_name, 1)) * 1000) + ss.slot_no * 23)::text, 7, '0')),
  concat('Block ', ss.slot_no, ', ', ss.section_name, ' Learning Residency')
from student_slots ss
on conflict (roll_no) do nothing;

update public.sections sec
set strength = student_totals.total_students
from (
  select section_id, count(*)::integer as total_students
  from public.students
  group by section_id
) as student_totals
where sec.id = student_totals.section_id;

insert into public.student_marks (
  student_id,
  student_name,
  section_id,
  class_name,
  subject_name,
  exam_type,
  marks,
  max_marks,
  teacher_profile_id
)
select
  st.id,
  st.name,
  st.section_id,
  sec.name,
  subj.name,
  exam.exam_type,
  greatest(
    48,
    least(
      98,
      52
      + ((length(st.roll_no) * 5 + subj.sort_order * 9 + exam.exam_index * 11 + ascii(right(sec.name, 1))) % 47)
    )
  )::integer,
  100,
  (
    select t.profile_id
    from public.teachers t
    where (
      t.assigned_class = sec.name
      or sec.name = any(coalesce(t.standards, '{}'::text[]))
    )
      and (
        t.subject = subj.name
        or t.profile_id is not null
      )
    order by
      (t.subject = subj.name) desc,
      (t.assigned_class = sec.name) desc,
      t.name asc
    limit 1
  )
from public.students st
join public.sections sec on sec.id = st.section_id
join public.subjects subj on subj.category_id = st.category_id
cross join (
  values
    ('Quarterly', 1),
    ('Half Yearly', 2),
    ('Annual', 3)
) as exam(exam_type, exam_index)
on conflict (student_id, subject_name, exam_type) do update set
  student_name = excluded.student_name,
  section_id = excluded.section_id,
  class_name = excluded.class_name,
  marks = excluded.marks,
  max_marks = excluded.max_marks,
  teacher_profile_id = excluded.teacher_profile_id;
