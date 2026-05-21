delete from public.student_fee_records sfr
using public.fee_categories fc
where fc.id = sfr.fee_category_id
  and fc.name in ('Tuition Fee', 'Term Fee', 'Book Fee', 'Note Fee', 'Exam Fee');

delete from public.fee_categories
where name in ('Tuition Fee', 'Term Fee', 'Book Fee', 'Note Fee', 'Exam Fee');
