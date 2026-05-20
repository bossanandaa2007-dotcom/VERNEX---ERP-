create table if not exists public.class_categories (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.class_categories (id) on delete cascade,
  name text not null unique,
  class_teacher text not null,
  strength integer not null default 20,
  room_number text
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  category_id text not null references public.class_categories (id) on delete restrict,
  name text not null,
  subject text not null,
  qualification text not null,
  experience text not null,
  contact text not null,
  email text not null unique,
  assigned_class text not null,
  standards text[] not null default '{}'
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  category_id text not null references public.class_categories (id) on delete restrict,
  section_id uuid not null references public.sections (id) on delete cascade,
  name text not null,
  email text unique,
  roll_no text not null unique,
  gender text not null check (gender in ('Male', 'Female', 'Other')),
  dob date not null,
  contact text not null,
  parent_name text not null,
  parent_contact text not null,
  address text not null
);

create unique index if not exists attendance_records_unique_per_day
on public.attendance_records (attendance_date, class_id, student_id);

alter table public.class_categories enable row level security;
alter table public.sections enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;

create policy "class_categories_select_authenticated"
on public.class_categories
for select
to authenticated
using (true);

create policy "sections_select_authenticated"
on public.sections
for select
to authenticated
using (true);

create policy "teachers_select_authenticated"
on public.teachers
for select
to authenticated
using (true);

create policy "students_select_authenticated"
on public.students
for select
to authenticated
using (true);

create policy "school_directory_manage_admin"
on public.sections
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

create policy "teachers_manage_admin"
on public.teachers
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

create policy "students_manage_admin"
on public.students
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

insert into public.class_categories (id, name, description, icon)
values
  ('kindergarten', 'Kindergarten', 'Early Childhood Education (LKG & UKG)', 'Baby'),
  ('primary', 'Primary', 'Standard 1st to 5th basic education', 'BookOpen'),
  ('secondary', 'Secondary', 'Advanced learning for 6th to 10th', 'GraduationCap'),
  ('higher-secondary', 'Higher Secondary', 'Professional prep for 11th & 12th', 'Building2')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon;

insert into public.sections (category_id, name, class_teacher, strength, room_number)
values
  ('secondary', '10-A', 'Mr. Rajesh Kumar', 20, 'S-301'),
  ('secondary', '10-B', 'Ms. Anjali Mehta', 20, 'S-302'),
  ('secondary', '9-A', 'Mr. Vivek Sharma', 20, 'S-201'),
  ('higher-secondary', '11-A', 'Ms. Kavya R', 20, 'HS-301')
on conflict (name) do update set
  category_id = excluded.category_id,
  class_teacher = excluded.class_teacher,
  strength = excluded.strength,
  room_number = excluded.room_number;

insert into public.teachers (profile_id, category_id, name, subject, qualification, experience, contact, email, assigned_class, standards)
values
  ((select id from public.profiles where email = 'teacher@school.edu'), 'secondary', 'Mr. Rajesh Kumar', 'Mathematics', 'M.Sc, B.Ed', '8 years', '+91 980001001', 'teacher@school.edu', '10-A', '{"10-A","10-B"}'),
  (null, 'secondary', 'Ms. Anjali Mehta', 'Science', 'M.Sc, B.Ed', '6 years', '+91 980001002', 'anjali@school.edu', '10-B', '{"10-B","9-A"}'),
  (null, 'secondary', 'Mr. Vivek Sharma', 'English', 'M.A, B.Ed', '9 years', '+91 980001003', 'vivek@school.edu', '9-A', '{"9-A","10-A"}'),
  (null, 'higher-secondary', 'Ms. Kavya R', 'Computer Science', 'M.Tech, B.Ed', '5 years', '+91 980001004', 'kavya@school.edu', '11-A', '{"11-A"}')
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

insert into public.students (profile_id, category_id, section_id, name, email, roll_no, gender, dob, contact, parent_name, parent_contact, address)
values
  ((select id from public.profiles where email = 'student@school.edu'), 'secondary', (select id from public.sections where name = '10-A'), 'Arjun Kumar', 'student@school.edu', '101', 'Male', '2008-05-14', '+91 950002001', 'Raj Kumar', '+91 950003001', '123 Academic Square, New Delhi'),
  (null, 'secondary', (select id from public.sections where name = '10-A'), 'Priya Sharma', 'priya@school.edu', '102', 'Female', '2008-08-22', '+91 950002002', 'Sita Sharma', '+91 950003002', '221 Learning Avenue, New Delhi'),
  (null, 'secondary', (select id from public.sections where name = '10-B'), 'Rahul Verma', 'rahul@school.edu', '103', 'Male', '2008-11-10', '+91 950002003', 'Vijay Verma', '+91 950003003', '45 Scholar Street, New Delhi'),
  (null, 'secondary', (select id from public.sections where name = '10-B'), 'Sneha Reddy', 'sneha@school.edu', '104', 'Female', '2008-03-05', '+91 950002004', 'K. Reddy', '+91 950003004', '89 Campus Garden, New Delhi'),
  (null, 'secondary', (select id from public.sections where name = '9-A'), 'Karthik S', 'karthik@school.edu', '105', 'Male', '2009-12-15', '+91 950002005', 'S. Kumar', '+91 950003005', '18 Wisdom Colony, New Delhi'),
  (null, 'higher-secondary', (select id from public.sections where name = '11-A'), 'Meena K', 'meena@school.edu', '201', 'Female', '2007-09-10', '+91 950002006', 'K. Mani', '+91 950003006', '72 River View, New Delhi')
on conflict (roll_no) do update set
  profile_id = excluded.profile_id,
  category_id = excluded.category_id,
  section_id = excluded.section_id,
  name = excluded.name,
  email = excluded.email,
  gender = excluded.gender,
  dob = excluded.dob,
  contact = excluded.contact,
  parent_name = excluded.parent_name,
  parent_contact = excluded.parent_contact,
  address = excluded.address;
