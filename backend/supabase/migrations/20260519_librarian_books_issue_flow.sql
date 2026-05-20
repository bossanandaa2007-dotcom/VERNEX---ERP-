create table if not exists public.librarian_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null,
  isbn text not null unique,
  total_copies integer not null,
  available_copies integer not null,
  status text not null
);

do $$
begin
  if to_regclass('public.library_books') is not null then
    insert into public.librarian_books (
      id,
      title,
      author,
      category,
      isbn,
      total_copies,
      available_copies,
      status
    )
    select
      id,
      title,
      author,
      category,
      isbn,
      total_copies,
      available_copies,
      status
    from public.library_books
    on conflict (id) do update set
      title = excluded.title,
      author = excluded.author,
      category = excluded.category,
      isbn = excluded.isbn,
      total_copies = excluded.total_copies,
      available_copies = excluded.available_copies,
      status = excluded.status;
  end if;
end;
$$;

alter table public.librarian_books enable row level security;

drop policy if exists "librarian_books_select_authenticated" on public.librarian_books;
create policy "librarian_books_select_authenticated"
on public.librarian_books
for select
to authenticated
using (true);

drop policy if exists "librarian_books_manage_staff" on public.librarian_books;
create policy "librarian_books_manage_staff"
on public.librarian_books
for all
to authenticated
using (public.current_profile_role() in ('Admin', 'Librarian'))
with check (public.current_profile_role() in ('Admin', 'Librarian'));

create table if not exists public.library_issues (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  book_id uuid not null references public.librarian_books (id) on delete restrict,
  issued_by uuid references public.profiles (id) on delete set null,
  issue_date date not null default current_date,
  due_date date not null,
  returned_at date,
  returned_by uuid references public.profiles (id) on delete set null,
  status text not null default 'Issued' check (status in ('Issued', 'Returned')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (due_date >= issue_date),
  check (returned_at is null or returned_at >= issue_date)
);

create table if not exists public.library_reminders (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.library_issues (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  book_id uuid not null references public.librarian_books (id) on delete cascade,
  sent_by uuid references public.profiles (id) on delete set null,
  reminder_message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
declare
  fk_constraint record;
begin
  for fk_constraint in
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'library_issues'
      and constraint_type = 'FOREIGN KEY'
      and constraint_name in (
        select con.conname
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'library_issues'
          and con.confrelid = to_regclass('public.library_books')
      )
  loop
    execute format('alter table public.library_issues drop constraint %I', fk_constraint.constraint_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'library_issues'
      and con.confrelid = 'public.librarian_books'::regclass
  ) then
    alter table public.library_issues
    add constraint library_issues_book_id_librarian_books_fkey
    foreign key (book_id) references public.librarian_books (id) on delete restrict;
  end if;
end;
$$;

do $$
declare
  fk_constraint record;
begin
  for fk_constraint in
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'library_reminders'
      and constraint_type = 'FOREIGN KEY'
      and constraint_name in (
        select con.conname
        from pg_constraint con
        join pg_class rel on rel.oid = con.conrelid
        join pg_namespace nsp on nsp.oid = rel.relnamespace
        where nsp.nspname = 'public'
          and rel.relname = 'library_reminders'
          and con.confrelid = to_regclass('public.library_books')
      )
  loop
    execute format('alter table public.library_reminders drop constraint %I', fk_constraint.constraint_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'library_reminders'
      and con.confrelid = 'public.librarian_books'::regclass
  ) then
    alter table public.library_reminders
    add constraint library_reminders_book_id_librarian_books_fkey
    foreign key (book_id) references public.librarian_books (id) on delete cascade;
  end if;
end;
$$;

create index if not exists library_issues_student_idx on public.library_issues (student_id, status);
create index if not exists library_issues_book_idx on public.library_issues (book_id, status);
create index if not exists library_issues_due_date_idx on public.library_issues (due_date, status);
create index if not exists library_reminders_issue_idx on public.library_reminders (issue_id, created_at desc);
create index if not exists library_reminders_student_idx on public.library_reminders (student_id, created_at desc);

alter table public.library_issues enable row level security;
alter table public.library_reminders enable row level security;

drop policy if exists "library_issues_select_scoped" on public.library_issues;
create policy "library_issues_select_scoped"
on public.library_issues
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Librarian')
  or exists (
    select 1
    from public.students student
    where student.id = library_issues.student_id
      and student.profile_id = auth.uid()
  )
);

drop policy if exists "library_issues_manage_staff" on public.library_issues;
create policy "library_issues_manage_staff"
on public.library_issues
for all
to authenticated
using (public.current_profile_role() in ('Admin', 'Librarian'))
with check (public.current_profile_role() in ('Admin', 'Librarian'));

drop policy if exists "library_reminders_select_scoped" on public.library_reminders;
create policy "library_reminders_select_scoped"
on public.library_reminders
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Librarian')
  or exists (
    select 1
    from public.students student
    where student.id = library_reminders.student_id
      and student.profile_id = auth.uid()
  )
);

drop policy if exists "library_reminders_manage_staff" on public.library_reminders;
create policy "library_reminders_manage_staff"
on public.library_reminders
for all
to authenticated
using (public.current_profile_role() in ('Admin', 'Librarian'))
with check (public.current_profile_role() in ('Admin', 'Librarian'));

create or replace function public.sync_librarian_book_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.available_copies := greatest(least(new.available_copies, new.total_copies), 0);
  new.status := case when new.available_copies > 0 then 'Available' else 'Not Available' end;
  return new;
end;
$$;

drop trigger if exists trg_sync_librarian_book_status on public.librarian_books;
create trigger trg_sync_librarian_book_status
before insert or update of total_copies, available_copies on public.librarian_books
for each row execute function public.sync_librarian_book_status();

create or replace function public.touch_library_issue()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_touch_library_issue on public.library_issues;
create trigger trg_touch_library_issue
before update on public.library_issues
for each row execute function public.touch_library_issue();

create or replace function public.issue_library_book(target_student_id uuid, target_book_id uuid, target_due_date date)
returns public.library_issues
language plpgsql
security definer
set search_path = public
as $$
declare
  book_row public.librarian_books;
  created_issue public.library_issues;
begin
  if public.current_profile_role() not in ('Admin', 'Librarian') then
    raise exception 'Only library staff can issue books.';
  end if;

  if target_due_date < current_date then
    raise exception 'Due date cannot be in the past.';
  end if;

  if not exists (select 1 from public.students where id = target_student_id) then
    raise exception 'Student not found.';
  end if;

  select *
  into book_row
  from public.librarian_books
  where id = target_book_id
  for update;

  if book_row.id is null then
    raise exception 'Book not found.';
  end if;

  if book_row.available_copies <= 0 then
    raise exception 'No copies available.';
  end if;

  update public.librarian_books
  set available_copies = available_copies - 1
  where id = target_book_id;

  insert into public.library_issues (
    student_id,
    book_id,
    issued_by,
    issue_date,
    due_date,
    status
  )
  values (
    target_student_id,
    target_book_id,
    auth.uid(),
    current_date,
    target_due_date,
    'Issued'
  )
  returning * into created_issue;

  return created_issue;
end;
$$;

create or replace function public.return_library_issue(target_issue_id uuid)
returns public.library_issues
language plpgsql
security definer
set search_path = public
as $$
declare
  issue_row public.library_issues;
  returned_issue public.library_issues;
begin
  if public.current_profile_role() not in ('Admin', 'Librarian') then
    raise exception 'Only library staff can mark returns.';
  end if;

  select *
  into issue_row
  from public.library_issues
  where id = target_issue_id
  for update;

  if issue_row.id is null then
    raise exception 'Issue record not found.';
  end if;

  if issue_row.status = 'Returned' then
    return issue_row;
  end if;

  update public.library_issues
  set
    returned_at = current_date,
    returned_by = auth.uid(),
    status = 'Returned'
  where id = target_issue_id
  returning * into returned_issue;

  update public.librarian_books
  set available_copies = available_copies + 1
  where id = issue_row.book_id;

  return returned_issue;
end;
$$;

create or replace function public.send_library_reminders(issue_ids uuid[], reminder_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_issue_id uuid;
  issue_row record;
begin
  if public.current_profile_role() not in ('Admin', 'Librarian') then
    raise exception 'Only library staff can send reminders.';
  end if;

  foreach target_issue_id in array send_library_reminders.issue_ids loop
    select
      issue.id,
      issue.student_id,
      issue.book_id,
      issue.due_date,
      student.profile_id,
      book.title as book_title
    into issue_row
    from public.library_issues issue
    join public.students student on student.id = issue.student_id
    join public.librarian_books book on book.id = issue.book_id
    where issue.id = target_issue_id
      and issue.status = 'Issued';

    if issue_row.id is null then
      continue;
    end if;

    insert into public.library_reminders (
      issue_id,
      student_id,
      book_id,
      sent_by,
      reminder_message
    )
    values (
      issue_row.id,
      issue_row.student_id,
      issue_row.book_id,
      auth.uid(),
      coalesce(reminder_message, 'Please return the issued library book.')
    );

    if issue_row.profile_id is not null then
      insert into public.notifications (
        recipient_id,
        recipient_role,
        student_id,
        notification_type,
        title,
        message
      )
      values (
        issue_row.profile_id,
        'Student',
        issue_row.student_id,
        'Library Reminder',
        'Library book return reminder',
        coalesce(reminder_message, 'Please return the issued library book.') || ' Book: ' || issue_row.book_title || '. Due: ' || issue_row.due_date::text || '.'
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.issue_library_book(uuid, uuid, date) to authenticated;
grant execute on function public.return_library_issue(uuid) to authenticated;
grant execute on function public.send_library_reminders(uuid[], text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'librarian_books'
    ) then
      alter publication supabase_realtime add table public.librarian_books;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'library_issues'
    ) then
      alter publication supabase_realtime add table public.library_issues;
    end if;
  end if;
end;
$$;
