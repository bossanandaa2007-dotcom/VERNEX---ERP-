grant execute on function public.admin_create_teacher_with_login(text, text, text, text, text, text[], text, text, text) to authenticated;

do $$
begin
  grant execute on function public.admin_create_student_with_login(text, text, text, text, date, text, text, text, text, text, uuid, text) to authenticated;
exception
  when undefined_function then
    grant execute on function public.admin_create_student_with_login(text, text, text, text, text, uuid, text, date, text, text, text, text) to authenticated;
end;
$$;

notify pgrst, 'reload schema';
