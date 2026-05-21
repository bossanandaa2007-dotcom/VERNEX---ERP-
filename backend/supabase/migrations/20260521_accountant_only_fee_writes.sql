drop policy if exists "fee_categories_manage_finance_staff" on public.fee_categories;
create policy "fee_categories_manage_finance_staff"
on public.fee_categories for all to authenticated
using (public.current_profile_role() = 'Accountant')
with check (public.current_profile_role() = 'Accountant');

drop policy if exists "student_fee_records_manage_finance_staff" on public.student_fee_records;
create policy "student_fee_records_manage_finance_staff"
on public.student_fee_records for all to authenticated
using (public.current_profile_role() = 'Accountant')
with check (public.current_profile_role() = 'Accountant');

drop policy if exists "accountant_notes_manage_finance_staff" on public.accountant_notes;
create policy "accountant_notes_manage_finance_staff"
on public.accountant_notes for all to authenticated
using (public.current_profile_role() = 'Accountant')
with check (public.current_profile_role() = 'Accountant');

drop policy if exists "fee_reminders_manage_finance_staff" on public.fee_reminders;
create policy "fee_reminders_manage_finance_staff"
on public.fee_reminders for all to authenticated
using (public.current_profile_role() = 'Accountant')
with check (public.current_profile_role() = 'Accountant');

create or replace function public.bulk_update_fee_status(
  record_ids uuid[],
  new_status text,
  partial_paid_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_record_id uuid;
  record_row public.student_fee_records;
  updated_row public.student_fee_records;
  next_paid_amount numeric(10,2);
  requested_status text;
begin
  if public.current_profile_role() <> 'Accountant' then
    raise exception 'Only accountants can update fee statuses.';
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

    requested_status := new_status;
    next_paid_amount := case
      when requested_status = 'Paid' then record_row.total_amount
      when requested_status = 'Pending' then 0
      else least(greatest(coalesce(partial_paid_amount, -1), 0), record_row.total_amount)
    end;

    if requested_status = 'Partial' and partial_paid_amount is null then
      raise exception 'Partial paid amount is required.';
    end if;

    update public.student_fee_records
    set
      status = requested_status,
      paid_amount = next_paid_amount,
      updated_by = auth.uid()
    where id = target_record_id
    returning * into updated_row;

    insert into public.fee_payment_history (
      student_fee_record_id,
      student_id,
      requested_status,
      old_status,
      new_status,
      old_paid_amount,
      new_paid_amount,
      old_remaining_amount,
      new_remaining_amount,
      entered_paid_amount,
      updated_by
    )
    values (
      updated_row.id,
      updated_row.student_id,
      requested_status,
      record_row.status,
      updated_row.status,
      record_row.paid_amount,
      updated_row.paid_amount,
      record_row.remaining_amount,
      updated_row.remaining_amount,
      case when requested_status = 'Partial' then partial_paid_amount else null end,
      auth.uid()
    );
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
  if public.current_profile_role() <> 'Accountant' then
    raise exception 'Only accountants can save accountant notes.';
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
  if public.current_profile_role() <> 'Accountant' then
    raise exception 'Only accountants can send fee reminders.';
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
  if public.current_profile_role() <> 'Accountant' then
    raise exception 'Only accountants can update fee due dates.';
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

create or replace function public.set_standard_term_fee(
  target_standard integer,
  target_term text,
  target_total_amount numeric,
  target_due_date date,
  reminder_message text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  category_name text;
  category_row public.fee_categories;
  affected_count integer := 0;
  default_message text;
begin
  if public.current_profile_role() <> 'Accountant' then
    raise exception 'Only accountants can assign standard term fees.';
  end if;

  if target_standard is null or target_standard < 1 or target_standard > 12 then
    raise exception 'Standard must be between 1 and 12.';
  end if;

  if target_term not in ('Term 1', 'Term 2', 'Term 3') then
    raise exception 'Term must be Term 1, Term 2, or Term 3.';
  end if;

  if target_total_amount is null or target_total_amount <= 0 then
    raise exception 'Fee amount must be greater than zero.';
  end if;

  if target_due_date is null then
    raise exception 'Due date is required.';
  end if;

  category_name := target_term || ' Fee';
  default_message := coalesce(
    nullif(trim(reminder_message), ''),
    category_name || ' of ' || target_total_amount::text || ' has been assigned for Standard ' || target_standard::text || '. Please pay before ' || target_due_date::text || '.'
  );

  insert into public.fee_categories (name, description, default_amount, default_due_day, is_active)
  values (
    category_name,
    'Standard-level ' || category_name || ' assigned by accountant.',
    target_total_amount,
    extract(day from target_due_date)::integer,
    true
  )
  on conflict (name) do update set
    default_amount = excluded.default_amount,
    default_due_day = excluded.default_due_day,
    is_active = true,
    updated_at = timezone('utc', now())
  returning * into category_row;

  with target_students as (
    select
      stu.id as student_id,
      stu.profile_id,
      stu.parent_contact,
      stu.class_id,
      stu.grade_id,
      sec.name as section_name
    from public.students stu
    join public.sections sec on sec.id = stu.section_id
    where split_part(sec.name, '-', 1) = target_standard::text
  ),
  updated_existing as (
    update public.student_fee_records sfr
    set
      class_id = ts.class_id,
      grade_id = ts.grade_id,
      total_amount = target_total_amount,
      paid_amount = least(sfr.paid_amount, target_total_amount),
      due_date = target_due_date,
      updated_by = auth.uid(),
      updated_at = timezone('utc', now())
    from target_students ts
    where sfr.student_id = ts.student_id
      and sfr.fee_category_id = category_row.id
    returning sfr.id, sfr.student_id
  ),
  inserted_records as (
    insert into public.student_fee_records (
      student_id,
      class_id,
      grade_id,
      fee_category_id,
      total_amount,
      paid_amount,
      remaining_amount,
      due_date,
      status,
      updated_by
    )
    select
      ts.student_id,
      ts.class_id,
      ts.grade_id,
      category_row.id,
      target_total_amount,
      0,
      target_total_amount,
      target_due_date,
      'Pending',
      auth.uid()
    from target_students ts
    where not exists (
      select 1
      from public.student_fee_records existing
      where existing.student_id = ts.student_id
        and existing.fee_category_id = category_row.id
    )
    returning id, student_id
  ),
  upserted_records as (
    select id, student_id from updated_existing
    union all
    select id, student_id from inserted_records
  ),
  reminder_rows as (
    insert into public.fee_reminders (
      student_fee_record_id,
      sent_by,
      recipient_student_id,
      parent_contact,
      reminder_message
    )
    select
      ur.id,
      auth.uid(),
      ts.student_id,
      ts.parent_contact,
      default_message
    from upserted_records ur
    join target_students ts on ts.student_id = ur.student_id
    returning id
  ),
  notification_rows as (
    insert into public.notifications (
      recipient_id,
      recipient_role,
      student_id,
      fee_record_id,
      notification_type,
      title,
      message
    )
    select
      ts.profile_id,
      'Student',
      ts.student_id,
      ur.id,
      'Fee Assignment',
      category_name || ' assigned',
      default_message
    from upserted_records ur
    join target_students ts on ts.student_id = ur.student_id
    where ts.profile_id is not null
    returning id
  )
  select count(*) into affected_count from upserted_records;

  return affected_count;
end;
$$;
