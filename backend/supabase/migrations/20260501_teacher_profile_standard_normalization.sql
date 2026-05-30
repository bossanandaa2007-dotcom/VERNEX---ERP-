update public.profiles
set standard = split_part(class_name, '-', 1)
where role = 'Teacher'
  and class_name is not null
  and class_name like '%-%';
