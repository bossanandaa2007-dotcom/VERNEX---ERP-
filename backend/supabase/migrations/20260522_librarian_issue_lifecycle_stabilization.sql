alter table public.library_issues
add column if not exists returned_date date,
add column if not exists reminder_sent boolean not null default false,
add column if not exists reminder_sent_at timestamptz,
add column if not exists overdue_status text not null default 'current';

update public.library_issues
set returned_date = returned_at
where returned_date is null and returned_at is not null;

update public.library_issues
set due_date = issue_date + 21
where lower(status) <> 'returned'
  and due_date <> issue_date + 21;

alter table public.library_issues
drop constraint if exists library_issues_status_check;

alter table public.library_issues
add constraint library_issues_status_check
check (lower(status) in ('issued', 'overdue', 'returned', 'reminder_sent'));

create index if not exists librarian_books_title_ci_idx
on public.librarian_books (lower(trim(title)));

create index if not exists library_issues_latest_activity_idx
on public.library_issues (updated_at desc, issue_date desc);

create table if not exists public.library_issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.library_issues (id) on delete cascade,
  action text not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.library_issue_history enable row level security;

drop policy if exists "library_issue_history_select_scoped" on public.library_issue_history;
create policy "library_issue_history_select_scoped"
on public.library_issue_history
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Librarian')
  or exists (
    select 1
    from public.library_issues issue
    join public.students student on student.id = issue.student_id
    where issue.id = library_issue_history.issue_id
      and student.profile_id = auth.uid()
  )
);

drop policy if exists "library_issue_history_manage_staff" on public.library_issue_history;
create policy "library_issue_history_manage_staff"
on public.library_issue_history
for all
to authenticated
using (public.current_profile_role() in ('Admin', 'Librarian'))
with check (public.current_profile_role() in ('Admin', 'Librarian'));

create or replace function public.issue_library_book(target_student_id uuid, target_book_id uuid, target_due_date date default null)
returns public.library_issues
language plpgsql
security definer
set search_path = public
as $$
declare
  book_row public.librarian_books;
  created_issue public.library_issues;
  resolved_due_date date := coalesce(target_due_date, current_date + 21);
begin
  if public.current_profile_role() not in ('Admin', 'Librarian') then
    raise exception 'Only library staff can issue books.';
  end if;

  if resolved_due_date < current_date then
    raise exception 'Due date cannot be in the past.';
  end if;

  if not exists (select 1 from public.students where id = target_student_id) then
    raise exception 'Student not found.';
  end if;

  select * into book_row
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
  set available_copies = greatest(available_copies - 1, 0)
  where id = target_book_id;

  insert into public.library_issues (
    student_id, book_id, issued_by, issue_date, due_date, status, overdue_status
  )
  values (
    target_student_id, target_book_id, auth.uid(), current_date, resolved_due_date, 'issued', 'current'
  )
  returning * into created_issue;

  insert into public.library_issue_history (issue_id, action, note, created_by)
  values (created_issue.id, 'issued', 'Book issued with 21-day return policy.', auth.uid());

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

  select * into issue_row
  from public.library_issues
  where id = target_issue_id
  for update;

  if issue_row.id is null then
    raise exception 'Issue record not found.';
  end if;

  if lower(issue_row.status) = 'returned' then
    return issue_row;
  end if;

  update public.library_issues
  set
    returned_at = current_date,
    returned_date = current_date,
    returned_by = auth.uid(),
    status = 'returned',
    overdue_status = 'returned'
  where id = target_issue_id
  returning * into returned_issue;

  update public.librarian_books
  set available_copies = least(available_copies + 1, total_copies)
  where id = issue_row.book_id;

  insert into public.library_issue_history (issue_id, action, note, created_by)
  values (target_issue_id, 'returned', 'Book marked as returned.', auth.uid());

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
      and lower(issue.status) <> 'returned';

    if issue_row.id is null then
      continue;
    end if;

    insert into public.library_reminders (
      issue_id, student_id, book_id, sent_by, reminder_message
    )
    values (
      issue_row.id,
      issue_row.student_id,
      issue_row.book_id,
      auth.uid(),
      coalesce(reminder_message, 'Please return the issued library book.')
    );

    update public.library_issues
    set
      reminder_sent = true,
      reminder_sent_at = timezone('utc', now()),
      status = 'reminder_sent',
      overdue_status = case when due_date < current_date then 'overdue' else 'current' end
    where id = issue_row.id;

    insert into public.library_issue_history (issue_id, action, note, created_by)
    values (issue_row.id, 'reminder_sent', coalesce(reminder_message, 'Please return the issued library book.'), auth.uid());

    if issue_row.profile_id is not null then
      insert into public.notifications (
        recipient_id, recipient_role, student_id, notification_type, title, message
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

create or replace function public.process_library_overdue_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  overdue_ids uuid[];
begin
  select coalesce(array_agg(id), '{}')
  into overdue_ids
  from public.library_issues
  where lower(status) <> 'returned'
    and due_date < current_date
    and coalesce(reminder_sent, false) = false;

  if coalesce(array_length(overdue_ids, 1), 0) > 0 then
    perform public.send_library_reminders(overdue_ids, 'Gentle reminder: your library book is overdue. Please return it soon.');
  end if;

  update public.library_issues
  set
    status = case when lower(status) = 'reminder_sent' then status else 'overdue' end,
    overdue_status = 'overdue'
  where lower(status) <> 'returned'
    and due_date < current_date;
end;
$$;

grant execute on function public.process_library_overdue_reminders() to authenticated;
