create table if not exists public.fee_payment_history (
  id uuid primary key default gen_random_uuid(),
  student_fee_record_id uuid not null references public.student_fee_records (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  requested_status text not null check (requested_status in ('Paid', 'Pending', 'Partial')),
  old_status text check (old_status in ('Paid', 'Pending', 'Partial')),
  new_status text not null check (new_status in ('Paid', 'Pending', 'Partial')),
  old_paid_amount numeric(10,2) not null default 0,
  new_paid_amount numeric(10,2) not null default 0,
  old_remaining_amount numeric(10,2) not null default 0,
  new_remaining_amount numeric(10,2) not null default 0,
  entered_paid_amount numeric(10,2),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists fee_payment_history_fee_record_idx
on public.fee_payment_history (student_fee_record_id, created_at desc);

alter table public.fee_payment_history enable row level security;

drop policy if exists "fee_payment_history_select_finance_or_student" on public.fee_payment_history;
create policy "fee_payment_history_select_finance_or_student"
on public.fee_payment_history for select to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.student_fee_records sfr
    join public.students stu on stu.id = sfr.student_id
    where sfr.id = fee_payment_history.student_fee_record_id
      and stu.profile_id = auth.uid()
  )
);

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
  else
    new.status := 'Pending';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop function if exists public.bulk_update_fee_status(uuid[], text);

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
      status = case when next_paid_amount >= total_amount then 'Paid' else 'Pending' end,
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

grant execute on function public.bulk_update_fee_status(uuid[], text, numeric) to authenticated;

update public.student_fee_records
set status = 'Pending'
where status = 'Partial'
  and paid_amount < total_amount;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'fee_payment_history'
    ) then
      alter publication supabase_realtime add table public.fee_payment_history;
    end if;
  end if;
end;
$$;
