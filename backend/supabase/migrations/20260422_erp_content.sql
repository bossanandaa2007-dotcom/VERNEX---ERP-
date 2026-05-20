create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  class_name text not null,
  deadline date not null,
  description text not null,
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_email text not null,
  submitted_at date not null,
  file_name text not null
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  class_name text not null,
  upload_date date not null,
  file_name text not null
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  description text not null,
  type text not null,
  target_audience text not null,
  status text not null
);

create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null,
  isbn text not null unique,
  total_copies integer not null,
  available_copies integer not null,
  status text not null
);

create table if not exists public.fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students (id) on delete cascade,
  student_email text not null,
  total_amount numeric(10,2) not null,
  paid_amount numeric(10,2) not null,
  pending_amount numeric(10,2) not null,
  due_date date not null,
  type text not null,
  status text not null
);

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.study_materials enable row level security;
alter table public.events enable row level security;
alter table public.library_books enable row level security;
alter table public.fee_records enable row level security;

create policy "assignments_select_authenticated"
on public.assignments for select to authenticated using (true);
create policy "assignment_submissions_select_authenticated"
on public.assignment_submissions for select to authenticated using (true);
create policy "study_materials_select_authenticated"
on public.study_materials for select to authenticated using (true);
create policy "events_select_authenticated"
on public.events for select to authenticated using (true);
create policy "library_books_select_authenticated"
on public.library_books for select to authenticated using (true);
create policy "fee_records_select_authenticated"
on public.fee_records for select to authenticated using (true);

create policy "assignments_manage_teacher_admin"
on public.assignments
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')));

create policy "assignment_submissions_insert_authenticated"
on public.assignment_submissions
for insert
to authenticated
with check (true);

create policy "study_materials_manage_teacher_admin"
on public.study_materials
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')));

create policy "events_manage_teacher_admin"
on public.events
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Admin', 'Teacher')));

create policy "library_books_manage_admin"
on public.library_books
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Admin'));

insert into public.assignments (title, subject, class_name, deadline, description, teacher_id)
values
  ('Quarterly Math Project', 'Mathematics', '10-A', '2026-04-30', 'Submit a detailed report on Trigonometric applications.', (select id from public.profiles where email = 'teacher@school.edu')),
  ('Physics Lab Record', 'Science', '10-B', '2026-05-05', 'Upload your completed lab observations for Optics experiments.', null)
on conflict do nothing;

insert into public.study_materials (title, subject, class_name, upload_date, file_name)
values
  ('Matrices and Determinants Notes', 'Mathematics', '10-A', '2026-04-01', 'matrices_notes.pdf'),
  ('Optics - Ray Diagrams Guide', 'Science', '10-B', '2026-03-28', 'optics_guide.pdf')
on conflict do nothing;

insert into public.events (name, date, description, type, target_audience, status)
values
  ('Annual Science Fair', '2026-05-15', 'Showcase your science projects and win amazing prizes.', 'Academic', 'Entire school', 'Open'),
  ('Inter-School Sports Meet', '2026-06-10', 'Compete in various track and field events.', 'Sports', 'Entire school', 'Upcoming')
on conflict do nothing;

insert into public.library_books (title, author, category, isbn, total_copies, available_copies, status)
values
  ('Understanding Physics', 'H.C. Verma', 'Science', '978-3-16-148410-0', 10, 8, 'Available'),
  ('Advanced Mathematics', 'R.D. Sharma', 'Maths', '978-0-12-345678-9', 5, 0, 'Not Available')
on conflict (isbn) do update set
  title = excluded.title,
  author = excluded.author,
  category = excluded.category,
  total_copies = excluded.total_copies,
  available_copies = excluded.available_copies,
  status = excluded.status;

insert into public.fee_records (student_id, student_email, total_amount, paid_amount, pending_amount, due_date, type, status)
values
  ((select id from public.students where email = 'student@school.edu'), 'student@school.edu', 5000.00, 2000.00, 3000.00, '2026-05-15', 'Tuition Fee', 'Pending'),
  ((select id from public.students where email = 'priya@school.edu'), 'priya@school.edu', 5000.00, 5000.00, 0.00, '2026-05-15', 'Tuition Fee', 'Paid')
on conflict do nothing;
