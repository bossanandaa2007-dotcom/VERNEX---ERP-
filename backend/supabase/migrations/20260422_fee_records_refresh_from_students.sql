delete from public.fee_records;

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
  s.email,
  case
    when s.category_id = 'kindergarten' then 4500.00
    when s.category_id = 'primary' then 6000.00
    when s.category_id = 'secondary' then 8000.00
    else 9500.00
  end as total_amount,
  case
    when mod(row_number() over (order by sec.name, s.roll_no), 4) = 0 then 0.00
    when mod(row_number() over (order by sec.name, s.roll_no), 4) = 1 then
      case
        when s.category_id = 'kindergarten' then 4500.00
        when s.category_id = 'primary' then 6000.00
        when s.category_id = 'secondary' then 8000.00
        else 9500.00
      end
    else
      case
        when s.category_id = 'kindergarten' then 2250.00
        when s.category_id = 'primary' then 3000.00
        when s.category_id = 'secondary' then 4000.00
        else 4750.00
      end
  end as paid_amount,
  case
    when mod(row_number() over (order by sec.name, s.roll_no), 4) = 0 then
      case
        when s.category_id = 'kindergarten' then 4500.00
        when s.category_id = 'primary' then 6000.00
        when s.category_id = 'secondary' then 8000.00
        else 9500.00
      end
    when mod(row_number() over (order by sec.name, s.roll_no), 4) = 1 then 0.00
    else
      case
        when s.category_id = 'kindergarten' then 2250.00
        when s.category_id = 'primary' then 3000.00
        when s.category_id = 'secondary' then 4000.00
        else 4750.00
      end
  end as pending_amount,
  date '2026-06-15',
  'Tuition Fee',
  case
    when mod(row_number() over (order by sec.name, s.roll_no), 4) = 1 then 'Paid'
    else 'Pending'
  end as status
from public.students s
join public.sections sec on sec.id = s.section_id
where s.email is not null;
