drop function if exists public.admin_create_student_with_login(text, text, text, text, text, uuid, text, date, text, text, text, text);

create or replace function public.admin_create_student_with_login(
  target_name text,
  target_roll_no text,
  target_email text,
  target_gender text,
  target_dob date,
  target_contact text,
  target_parent_name text,
  target_parent_contact text,
  target_address text,
  target_category_id text,
  target_section_id uuid,
  target_password text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_student_id uuid;
  normalized_email text;
begin
  if public.current_profile_role() <> 'Admin' then
    raise exception 'Only admins can create student logins.';
  end if;

  normalized_email := lower(trim(coalesce(target_email, '')));

  if normalized_email = '' then
    raise exception 'Student email is required.';
  end if;

  if trim(coalesce(target_name, '')) = '' then
    raise exception 'Student name is required.';
  end if;

  if trim(coalesce(target_roll_no, '')) = '' then
    raise exception 'Student roll number is required.';
  end if;

  if target_dob is null then
    raise exception 'Student DOB is required.';
  end if;

  if target_category_id is null or trim(target_category_id) = '' then
    raise exception 'Student level is required.';
  end if;

  if target_section_id is null then
    raise exception 'Student section is required.';
  end if;

  if length(coalesce(target_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  if exists (select 1 from auth.users where lower(email) = normalized_email) then
    raise exception 'A login already exists for this email address.';
  end if;

  insert into public.students (
    category_id,
    section_id,
    name,
    email,
    roll_no,
    gender,
    dob,
    contact,
    parent_name,
    parent_contact,
    address
  )
  values (
    target_category_id,
    target_section_id,
    trim(coalesce(target_name, '')),
    normalized_email,
    trim(coalesce(target_roll_no, '')),
    target_gender,
    target_dob,
    trim(coalesce(target_contact, '')),
    trim(coalesce(target_parent_name, '')),
    trim(coalesce(target_parent_contact, '')),
    trim(coalesce(target_address, ''))
  )
  returning id into created_student_id;

  perform public.provision_student_login_with_password(created_student_id, target_password);

  return created_student_id;
end;
$$;

grant execute on function public.admin_create_student_with_login(text, text, text, text, date, text, text, text, text, text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
