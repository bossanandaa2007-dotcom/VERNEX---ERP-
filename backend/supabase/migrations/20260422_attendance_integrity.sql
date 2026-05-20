create unique index if not exists attendance_records_unique_day_class_student
on public.attendance_records (attendance_date, class_id, student_id);

create index if not exists attendance_records_date_idx
on public.attendance_records (attendance_date);

create index if not exists attendance_records_class_date_idx
on public.attendance_records (class_id, attendance_date);
