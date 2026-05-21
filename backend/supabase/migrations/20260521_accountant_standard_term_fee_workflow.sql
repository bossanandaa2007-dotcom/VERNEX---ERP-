insert into public.fee_categories (name, description, default_amount, default_due_day)
values
  ('Term 1 Fee', 'Standard-level Term 1 fee assigned by accountant.', 0.00, 10),
  ('Term 2 Fee', 'Standard-level Term 2 fee assigned by accountant.', 0.00, 10),
  ('Term 3 Fee', 'Standard-level Term 3 fee assigned by accountant.', 0.00, 10)
on conflict (name) do update set
  description = excluded.description,
  is_active = true,
  updated_at = timezone('utc', now());

create or replace function public.sync_student_fee_record_amounts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.paid_amount := least(greatest(coalesce(new.paid_amount, 0), 0), coalesce(new.total_amount, 0));
  new.remaining_amount := greatest(new.total_amount - new.paid_amount, 0);

  if new.paid_amount >= new.total_amount then
    new.status := 'Paid';
    new.remaining_amount := 0;
  elsif new.paid_amount > 0 then
    new.status := 'Partial';
  else
    new.status := 'Pending';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

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
  if public.current_profile_role() not in ('Admin', 'Accountant') then
    raise exception 'Only finance staff can assign standard term fees.';
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

grant execute on function public.bulk_update_fee_status(uuid[], text, numeric) to authenticated;
grant execute on function public.set_standard_term_fee(integer, text, numeric, date, text) to authenticated;
