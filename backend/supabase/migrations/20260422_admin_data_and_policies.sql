drop policy if exists "attendance_update_teacher_admin" on public.attendance_records;

create policy "attendance_update_teacher_admin"
on public.attendance_records
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Teacher')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('Admin', 'Teacher')
  )
);

insert into public.attendance_records (
  section_id,
  class_id,
  attendance_date,
  student_id,
  student_name,
  status,
  source,
  confidence_score,
  metadata
)
select
  s.section_id,
  sec.name,
  generated.day::date,
  s.id,
  s.name,
  case
    when mod(abs(('x' || substr(md5(s.roll_no || generated.day::text), 1, 8))::bit(32)::int), 100) < 82 then 'Present'
    else 'Absent'
  end,
  'Manual',
  1,
  jsonb_build_object('seeded', true, 'reason', 'admin-analytics-bootstrap')
from public.students s
join public.sections sec on sec.id = s.section_id
cross join generate_series(current_date - interval '6 day', current_date, interval '1 day') as generated(day)
on conflict (attendance_date, class_id, student_id) do nothing;

insert into public.fee_records (
  student_id,
  student_email,
  total_amount,
  paid_amount,
  pending_amount,
  due_date,
  type,
  status
)
select
  s.id,
  coalesce(s.email, lower(replace(s.name, ' ', '.')) || '@school.edu'),
  case
    when s.category_id = 'kindergarten' then 5000.00
    when s.category_id = 'primary' then 6500.00
    when s.category_id = 'secondary' then 8000.00
    else 9500.00
  end,
  case
    when mod(abs(('x' || substr(md5(s.roll_no), 1, 8))::bit(32)::int), 2) = 0 then
      case
        when s.category_id = 'kindergarten' then 5000.00
        when s.category_id = 'primary' then 6500.00
        when s.category_id = 'secondary' then 8000.00
        else 9500.00
      end
    else
      case
        when s.category_id = 'kindergarten' then 2500.00
        when s.category_id = 'primary' then 3250.00
        when s.category_id = 'secondary' then 4000.00
        else 4750.00
      end
  end,
  case
    when mod(abs(('x' || substr(md5(s.roll_no), 1, 8))::bit(32)::int), 2) = 0 then 0.00
    else
      case
        when s.category_id = 'kindergarten' then 2500.00
        when s.category_id = 'primary' then 3250.00
        when s.category_id = 'secondary' then 4000.00
        else 4750.00
      end
  end,
  current_date + interval '15 day',
  'Tuition Fee',
  case
    when mod(abs(('x' || substr(md5(s.roll_no), 1, 8))::bit(32)::int), 2) = 0 then 'Paid'
    else 'Pending'
  end
from public.students s
where not exists (
  select 1
  from public.fee_records fr
  where fr.student_id = s.id
);

insert into public.events (name, date, description, type, target_audience, status)
select
  'Parent Teacher Meeting',
  current_date + interval '10 day',
  'Monthly PTM synced for the admin calendar and event board.',
  'Event',
  'All',
  'Open'
where not exists (
  select 1
  from public.events
  where name = 'Parent Teacher Meeting'
);
