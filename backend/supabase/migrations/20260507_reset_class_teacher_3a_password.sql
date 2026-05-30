update auth.users
set
  encrypted_password = crypt('Teacher@123', gen_salt('bf')),
  updated_at = timezone('utc', now())
where lower(email) = 'class.teacher.3a@school.edu';
