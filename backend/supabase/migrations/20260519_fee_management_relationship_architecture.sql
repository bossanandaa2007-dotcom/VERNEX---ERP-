create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  grade_number integer not null unique check (grade_number between 1 and 12),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades (id) on delete cascade,
  name text not null,
  section text not null,
  section_id uuid unique references public.sections (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (grade_id, name, section)
);

alter table public.students
add column if not exists grade_id uuid references public.grades (id) on delete set null,
add column if not exists class_id uuid references public.classes (id) on delete set null;

insert into public.grades (grade_number, name)
select distinct
  substring(sec.name from '^[0-9]+')::integer as grade_number,
  'Grade ' || substring(sec.name from '^[0-9]+') as name
from public.sections sec
where sec.name ~ '^[0-9]+'
on conflict (grade_number) do update set
  name = excluded.name;

insert into public.classes (grade_id, name, section, section_id)
select
  g.id,
  substring(sec.name from '^[0-9]+') as name,
  coalesce(nullif(substring(sec.name from '-(.+)$'), ''), 'A') as section,
  sec.id
from public.sections sec
join public.grades g on g.grade_number = substring(sec.name from '^[0-9]+')::integer
where sec.name ~ '^[0-9]+'
on conflict (section_id) do update set
  grade_id = excluded.grade_id,
  name = excluded.name,
  section = excluded.section;

update public.students stu
set
  grade_id = cls.grade_id,
  class_id = cls.id
from public.classes cls
where cls.section_id = stu.section_id
  and (stu.grade_id is distinct from cls.grade_id or stu.class_id is distinct from cls.id);

create table if not exists public.fee_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  default_amount numeric(10,2) not null default 0 check (default_amount >= 0),
  default_due_day integer check (default_due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.fee_categories (name, description, default_amount, default_due_day)
values
  ('Tuition Fee', 'Recurring academic tuition fee.', 8000.00, 10),
  ('Book Fee', 'Books and learning material fee.', 2500.00, 12),
  ('Note Fee', 'Notebook and stationery fee.', 1200.00, 12),
  ('Term Fee', 'Term based school fee.', 5000.00, 15),
  ('Exam Fee', 'Assessment and examination fee.', 1500.00, 20)
on conflict (name) do update set
  description = excluded.description,
  default_amount = excluded.default_amount,
  default_due_day = excluded.default_due_day,
  is_active = true,
  updated_at = timezone('utc', now());

create table if not exists public.student_fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  grade_id uuid references public.grades (id) on delete set null,
  fee_category_id uuid not null references public.fee_categories (id) on delete restrict,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(10,2) not null default 0 check (remaining_amount >= 0),
  due_date date not null,
  status text not null default 'Pending' check (status in ('Paid', 'Pending', 'Partial')),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (student_id, fee_category_id, due_date)
);

create table if not exists public.accountant_notes (
  id uuid primary key default gen_random_uuid(),
  student_fee_record_id uuid not null references public.student_fee_records (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  accountant_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_fee_record_id, accountant_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  recipient_role text not null,
  student_id uuid references public.students (id) on delete cascade,
  fee_record_id uuid references public.student_fee_records (id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fee_reminders (
  id uuid primary key default gen_random_uuid(),
  student_fee_record_id uuid not null references public.student_fee_records (id) on delete cascade,
  sent_by uuid references public.profiles (id) on delete set null,
  recipient_student_id uuid not null references public.students (id) on delete cascade,
  recipient_parent_id uuid references public.profiles (id) on delete set null,
  parent_contact text,
  reminder_message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fee_status_history (
  id uuid primary key default gen_random_uuid(),
  student_fee_record_id uuid not null references public.student_fee_records (id) on delete cascade,
  old_status text check (old_status in ('Paid', 'Pending', 'Partial')),
  new_status text not null check (new_status in ('Paid', 'Pending', 'Partial')),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.student_fee_records (
  student_id,
  class_id,
  grade_id,
  fee_category_id,
  total_amount,
  paid_amount,
  remaining_amount,
  due_date,
  status
)
select
  fr.student_id,
  stu.class_id,
  stu.grade_id,
  fc.id,
  fr.total_amount,
  fr.paid_amount,
  fr.pending_amount,
  fr.due_date,
  case when fr.status in ('Paid', 'Pending', 'Partial') then fr.status else 'Pending' end
from public.fee_records fr
join public.students stu on stu.id = fr.student_id
join public.fee_categories fc on fc.name = fr.type
where fr.student_id is not null
on conflict (student_id, fee_category_id, due_date) do update set
  class_id = excluded.class_id,
  grade_id = excluded.grade_id,
  total_amount = excluded.total_amount,
  paid_amount = excluded.paid_amount,
  remaining_amount = excluded.remaining_amount,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.student_fee_records (
  student_id,
  class_id,
  grade_id,
  fee_category_id,
  total_amount,
  paid_amount,
  remaining_amount,
  due_date,
  status
)
select
  stu.id,
  stu.class_id,
  stu.grade_id,
  fc.id,
  case
    when fc.name = 'Tuition Fee' and stu.category_id = 'kindergarten' then 5000.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'primary' then 6500.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'secondary' then 8000.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'higher-secondary' then 9500.00
    else fc.default_amount
  end as total_amount,
  0.00 as paid_amount,
  case
    when fc.name = 'Tuition Fee' and stu.category_id = 'kindergarten' then 5000.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'primary' then 6500.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'secondary' then 8000.00
    when fc.name = 'Tuition Fee' and stu.category_id = 'higher-secondary' then 9500.00
    else fc.default_amount
  end as remaining_amount,
  make_date(extract(year from current_date)::integer, extract(month from current_date)::integer, least(coalesce(fc.default_due_day, 15), 28)) as due_date,
  'Pending'
from public.students stu
cross join public.fee_categories fc
where fc.is_active
on conflict (student_id, fee_category_id, due_date) do nothing;

create index if not exists classes_grade_id_idx on public.classes (grade_id);
create index if not exists students_grade_class_idx on public.students (grade_id, class_id);
create index if not exists student_fee_records_student_idx on public.student_fee_records (student_id);
create index if not exists student_fee_records_grade_class_idx on public.student_fee_records (grade_id, class_id);
create index if not exists student_fee_records_category_status_idx on public.student_fee_records (fee_category_id, status);
create index if not exists student_fee_records_due_date_idx on public.student_fee_records (due_date);
create index if not exists accountant_notes_fee_record_idx on public.accountant_notes (student_fee_record_id, updated_at desc);
create index if not exists fee_reminders_fee_record_idx on public.fee_reminders (student_fee_record_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, is_read, created_at desc);
create index if not exists notifications_fee_record_idx on public.notifications (fee_record_id, created_at desc);
create index if not exists fee_status_history_fee_record_idx on public.fee_status_history (student_fee_record_id, updated_at desc);

alter table public.grades enable row level security;
alter table public.classes enable row level security;
alter table public.fee_categories enable row level security;
alter table public.student_fee_records enable row level security;
alter table public.accountant_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.fee_reminders enable row level security;
alter table public.fee_status_history enable row level security;

drop policy if exists "grades_select_authenticated" on public.grades;
create policy "grades_select_authenticated"
on public.grades for select to authenticated using (true);

drop policy if exists "classes_select_authenticated" on public.classes;
create policy "classes_select_authenticated"
on public.classes for select to authenticated using (true);

drop policy if exists "fee_categories_select_authenticated" on public.fee_categories;
create policy "fee_categories_select_authenticated"
on public.fee_categories for select to authenticated using (true);

drop policy if exists "fee_categories_manage_finance_staff" on public.fee_categories;
create policy "fee_categories_manage_finance_staff"
on public.fee_categories for all to authenticated
using (public.current_profile_role() in ('Admin', 'Accountant'))
with check (public.current_profile_role() in ('Admin', 'Accountant'));

drop policy if exists "student_fee_records_select_related" on public.student_fee_records;
create policy "student_fee_records_select_related"
on public.student_fee_records for select to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.students stu
    where stu.id = student_fee_records.student_id
      and stu.profile_id = auth.uid()
  )
);

drop policy if exists "student_fee_records_manage_finance_staff" on public.student_fee_records;
create policy "student_fee_records_manage_finance_staff"
on public.student_fee_records for all to authenticated
using (public.current_profile_role() in ('Admin', 'Accountant'))
with check (public.current_profile_role() in ('Admin', 'Accountant'));

drop policy if exists "accountant_notes_select_related" on public.accountant_notes;
create policy "accountant_notes_select_related"
on public.accountant_notes for select to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.students stu
    where stu.id = accountant_notes.student_id
      and stu.profile_id = auth.uid()
  )
);

drop policy if exists "accountant_notes_manage_finance_staff" on public.accountant_notes;
create policy "accountant_notes_manage_finance_staff"
on public.accountant_notes for all to authenticated
using (public.current_profile_role() in ('Admin', 'Accountant'))
with check (public.current_profile_role() in ('Admin', 'Accountant'));

drop policy if exists "notifications_select_recipient_or_staff" on public.notifications;
create policy "notifications_select_recipient_or_staff"
on public.notifications for select to authenticated
using (
  recipient_id = auth.uid()
  or public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
);

drop policy if exists "notifications_update_read_own" on public.notifications;
create policy "notifications_update_read_own"
on public.notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "fee_reminders_select_related" on public.fee_reminders;
create policy "fee_reminders_select_related"
on public.fee_reminders for select to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.students stu
    where stu.id = fee_reminders.recipient_student_id
      and stu.profile_id = auth.uid()
  )
);

drop policy if exists "fee_reminders_manage_finance_staff" on public.fee_reminders;
create policy "fee_reminders_manage_finance_staff"
on public.fee_reminders for all to authenticated
using (public.current_profile_role() in ('Admin', 'Accountant'))
with check (public.current_profile_role() in ('Admin', 'Accountant'));

drop policy if exists "fee_status_history_select_finance_or_student" on public.fee_status_history;
create policy "fee_status_history_select_finance_or_student"
on public.fee_status_history for select to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.student_fee_records sfr
    join public.students stu on stu.id = sfr.student_id
    where sfr.id = fee_status_history.student_fee_record_id
      and stu.profile_id = auth.uid()
  )
);

create or replace function public.sync_student_fee_record_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.remaining_amount := greatest(new.total_amount - new.paid_amount, 0);

  if new.paid_amount >= new.total_amount then
    new.status := 'Paid';
    new.remaining_amount := 0;
  elsif new.paid_amount > 0 and new.status = 'Paid' then
    new.status := 'Partial';
  elsif new.paid_amount = 0 and new.status = 'Partial' then
    new.status := 'Pending';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_sync_student_fee_record_amounts on public.student_fee_records;
create trigger trg_sync_student_fee_record_amounts
before insert or update of total_amount, paid_amount, status on public.student_fee_records
for each row execute function public.sync_student_fee_record_amounts();

create or replace function public.log_fee_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_profile_id uuid;
  category_name text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select stu.profile_id, fc.name
  into student_profile_id, category_name
  from public.students stu
  join public.fee_categories fc on fc.id = new.fee_category_id
  where stu.id = new.student_id;

  insert into public.fee_status_history (
    student_fee_record_id,
    old_status,
    new_status,
    updated_by
  )
  values (
    new.id,
    old.status,
    new.status,
    new.updated_by
  );

  if student_profile_id is not null then
    insert into public.notifications (
      recipient_id,
      recipient_role,
      student_id,
      fee_record_id,
      notification_type,
      title,
      message
    )
    values (
      student_profile_id,
      'Student',
      new.student_id,
      new.id,
      'Fee Status',
      coalesce(category_name, 'Fee') || ' marked as ' || new.status,
      case
        when new.status = 'Paid' then coalesce(category_name, 'Fee') || ' has been marked as paid.'
        when new.status = 'Partial' then 'Remaining ' || new.remaining_amount::text || ' pending for ' || coalesce(category_name, 'Fee') || '.'
        else coalesce(category_name, 'Fee') || ' is pending. Remaining amount: ' || new.remaining_amount::text || '.'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_fee_status_change on public.student_fee_records;
create trigger trg_log_fee_status_change
after update of status on public.student_fee_records
for each row execute function public.log_fee_status_change();

create or replace function public.notify_accountant_note_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_profile_id uuid;
  category_name text;
begin
  new.updated_at := timezone('utc', now());

  if tg_op = 'UPDATE' and old.note is not distinct from new.note then
    return new;
  end if;

  if coalesce(trim(new.note), '') = '' then
    return new;
  end if;

  select stu.profile_id, fc.name
  into student_profile_id, category_name
  from public.student_fee_records sfr
  join public.students stu on stu.id = sfr.student_id
  join public.fee_categories fc on fc.id = sfr.fee_category_id
  where sfr.id = new.student_fee_record_id;

  if student_profile_id is not null then
    insert into public.notifications (
      recipient_id,
      recipient_role,
      student_id,
      fee_record_id,
      notification_type,
      title,
      message
    )
    values (
      student_profile_id,
      'Student',
      new.student_id,
      new.student_fee_record_id,
      'Accountant Note',
      'Accountant note for ' || coalesce(category_name, 'Fee'),
      new.note
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_accountant_note_change on public.accountant_notes;
create trigger trg_notify_accountant_note_change
before insert or update of note on public.accountant_notes
for each row execute function public.notify_accountant_note_change();

create or replace function public.bulk_update_fee_status(record_ids uuid[], new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_record_id uuid;
  record_row public.student_fee_records;
  next_paid_amount numeric(10,2);
begin
  if public.current_profile_role() not in ('Admin', 'Accountant') then
    raise exception 'Only finance staff can update fee statuses.';
  end if;

  if new_status not in ('Paid', 'Pending', 'Partial') then
    raise exception 'Invalid fee status: %', new_status;
  end if;

  foreach target_record_id in array bulk_update_fee_status.record_ids loop
    select *
    into record_row
    from public.student_fee_records
    where id = target_record_id
    for update;

    if record_row.id is null then
      continue;
    end if;

    next_paid_amount := case
      when new_status = 'Paid' then record_row.total_amount
      when new_status = 'Pending' then 0
      when record_row.paid_amount > 0 and record_row.paid_amount < record_row.total_amount then record_row.paid_amount
      else round(record_row.total_amount * 0.5, 2)
    end;

    update public.student_fee_records
    set
      status = new_status,
      paid_amount = next_paid_amount,
      updated_by = auth.uid()
    where id = target_record_id;
  end loop;
end;
$$;

create or replace function public.upsert_accountant_note(target_fee_record_id uuid, note_text text)
returns public.accountant_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  fee_row public.student_fee_records;
  saved_note public.accountant_notes;
begin
  if public.current_profile_role() not in ('Admin', 'Accountant') then
    raise exception 'Only finance staff can save accountant notes.';
  end if;

  select *
  into fee_row
  from public.student_fee_records
  where id = target_fee_record_id;

  if fee_row.id is null then
    raise exception 'Fee record not found.';
  end if;

  insert into public.accountant_notes (
    student_fee_record_id,
    student_id,
    accountant_id,
    note
  )
  values (
    target_fee_record_id,
    fee_row.student_id,
    auth.uid(),
    coalesce(note_text, '')
  )
  on conflict (student_fee_record_id, accountant_id) do update set
    note = excluded.note,
    updated_at = timezone('utc', now())
  returning * into saved_note;

  return saved_note;
end;
$$;

create or replace function public.send_fee_reminders(record_ids uuid[], reminder_message text, reminder_type text default 'Fee Reminder')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_record_id uuid;
  fee_row record;
begin
  if public.current_profile_role() not in ('Admin', 'Accountant') then
    raise exception 'Only finance staff can send fee reminders.';
  end if;

  foreach target_record_id in array send_fee_reminders.record_ids loop
    select
      sfr.id,
      sfr.student_id,
      sfr.remaining_amount,
      stu.profile_id,
      stu.parent_contact,
      fc.name as category_name
    into fee_row
    from public.student_fee_records sfr
    join public.students stu on stu.id = sfr.student_id
    join public.fee_categories fc on fc.id = sfr.fee_category_id
    where sfr.id = target_record_id;

    if fee_row.id is null then
      continue;
    end if;

    insert into public.fee_reminders (
      student_fee_record_id,
      sent_by,
      recipient_student_id,
      parent_contact,
      reminder_message
    )
    values (
      fee_row.id,
      auth.uid(),
      fee_row.student_id,
      fee_row.parent_contact,
      coalesce(reminder_message, 'Please clear the pending fee at the earliest.')
    );

    if fee_row.profile_id is not null then
      insert into public.notifications (
        recipient_id,
        recipient_role,
        student_id,
        fee_record_id,
        notification_type,
        title,
        message
      )
      values (
        fee_row.profile_id,
        'Student',
        fee_row.student_id,
        fee_row.id,
        coalesce(reminder_type, 'Fee Reminder'),
        'Reminder sent by accountant',
        coalesce(reminder_message, 'Please clear the pending fee at the earliest.') || ' Remaining amount: ' || fee_row.remaining_amount::text || ' for ' || coalesce(fee_row.category_name, 'Fee') || '.'
      );
    end if;
  end loop;
end;
$$;

create or replace function public.set_fee_category_due_date(category_name text, target_due_date date, record_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() not in ('Admin', 'Accountant') then
    raise exception 'Only finance staff can update fee due dates.';
  end if;

  if target_due_date is null then
    raise exception 'Due date is required.';
  end if;

  update public.student_fee_records sfr
  set
    due_date = target_due_date,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  from public.fee_categories fc
  where fc.id = sfr.fee_category_id
    and fc.name = set_fee_category_due_date.category_name
    and (
      set_fee_category_due_date.record_ids is null
      or sfr.id = any(set_fee_category_due_date.record_ids)
    );
end;
$$;

grant execute on function public.bulk_update_fee_status(uuid[], text) to authenticated;
grant execute on function public.upsert_accountant_note(uuid, text) to authenticated;
grant execute on function public.send_fee_reminders(uuid[], text, text) to authenticated;
grant execute on function public.set_fee_category_due_date(text, date, uuid[]) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'student_fee_records'
    ) then
      alter publication supabase_realtime add table public.student_fee_records;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'accountant_notes'
    ) then
      alter publication supabase_realtime add table public.accountant_notes;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'fee_reminders'
    ) then
      alter publication supabase_realtime add table public.fee_reminders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
