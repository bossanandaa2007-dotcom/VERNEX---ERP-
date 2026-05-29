-- Storage optimization pass:
-- - remove legacy library/fee tables after the app moved to librarian_books/student_fee_records
-- - remove duplicated student display fields where they can be derived from FK relationships
-- - keep compatibility through query redirection views and updated RLS/RPC logic

drop policy if exists "assignment_submissions_select_scoped" on public.assignment_submissions;
drop policy if exists "assignment_submissions_insert_student" on public.assignment_submissions;

create policy "assignment_submissions_select_scoped"
on public.assignment_submissions
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or student_id = auth.uid()
  or exists (
    select 1
    from public.assignments assignment
    where assignment.id = assignment_id
      and assignment.teacher_id = auth.uid()
  )
);

create policy "assignment_submissions_insert_student"
on public.assignment_submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments assignment
    join public.students student on student.profile_id = auth.uid()
    join public.sections section on section.id = student.section_id
    where assignment.id = assignment_id
      and section.name = assignment.class_name
  )
);

alter table if exists public.assignment_submissions
drop column if exists student_email;

alter table if exists public.attendance_records
drop column if exists student_name;

create or replace function public.teacher_handles_class_subject(
  target_section_id uuid,
  target_class_name text,
  target_subject_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.section_teacher_assignments assignment
    join public.teachers teacher on teacher.id = assignment.teacher_id
    join public.sections section on section.id = assignment.section_id
    where teacher.profile_id = auth.uid()
      and assignment.section_id = target_section_id
      and assignment.role = 'Subject Teacher'
      and lower(trim(assignment.subject)) = lower(trim(target_subject_name))
      and (target_class_name is null or section.name = target_class_name)
  )
  or exists (
    select 1
    from public.teachers teacher
    join public.sections section on section.id = teacher.home_section_id
    cross join lateral (
      select unnest(
        case
          when coalesce(array_length(teacher.subjects, 1), 0) > 0 then teacher.subjects
          when coalesce(teacher.subject, '') <> '' then array[teacher.subject]
          else '{}'::text[]
        end
      ) as subject_name
    ) teacher_subjects
    where teacher.profile_id = auth.uid()
      and teacher.home_section_id = target_section_id
      and lower(trim(teacher_subjects.subject_name)) = lower(trim(target_subject_name))
      and (target_class_name is null or section.name = target_class_name)
  );
$$;

drop policy if exists "student_marks_select_scoped" on public.student_marks;
drop policy if exists "student_marks_insert_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_update_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_delete_teacher_admin" on public.student_marks;
drop policy if exists "student_marks_insert_exact_subject_teacher" on public.student_marks;
drop policy if exists "student_marks_update_exact_subject_teacher" on public.student_marks;
drop policy if exists "student_marks_delete_exact_subject_teacher" on public.student_marks;

create policy "student_marks_select_scoped"
on public.student_marks
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.id = public.student_marks.student_id
  )
  or exists (
    select 1
    from public.teachers teacher
    where teacher.profile_id = auth.uid()
      and teacher.home_section_id = public.student_marks.section_id
  )
  or exists (
    select 1
    from public.section_teacher_assignments assignment
    join public.teachers teacher on teacher.id = assignment.teacher_id
    where teacher.profile_id = auth.uid()
      and assignment.section_id = public.student_marks.section_id
      and assignment.role = 'Subject Teacher'
  )
);

create policy "student_marks_insert_exact_subject_teacher"
on public.student_marks
for insert
to authenticated
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(section_id, null, subject_name)
  )
);

create policy "student_marks_update_exact_subject_teacher"
on public.student_marks
for update
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(public.student_marks.section_id, null, public.student_marks.subject_name)
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(section_id, null, subject_name)
  )
);

create policy "student_marks_delete_exact_subject_teacher"
on public.student_marks
for delete
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.current_profile_role() = 'Teacher'
    and public.teacher_handles_class_subject(public.student_marks.section_id, null, public.student_marks.subject_name)
  )
);

drop index if exists public.student_marks_class_exam_idx;
create index if not exists student_marks_section_exam_idx
on public.student_marks (section_id, exam_type);

alter table if exists public.student_marks
drop column if exists student_name,
drop column if exists class_name;

create or replace function public.submit_complaint(
  target_title text,
  target_description text,
  target_type text,
  target_priority text,
  target_target_id text,
  target_target_role text,
  target_target_type text
)
returns public.complaints
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row public.students;
  created_row public.complaints;
begin
  if public.current_profile_role() <> 'Student' then
    raise exception 'Only students can submit complaints.';
  end if;

  if target_type not in ('Academic', 'Infrastructure', 'Discipline', 'Hostel', 'Fees', 'Other') then
    raise exception 'Invalid complaint type: %', target_type;
  end if;

  if target_priority not in ('Low', 'Medium', 'High') then
    raise exception 'Invalid complaint priority: %', target_priority;
  end if;

  if target_target_type not in ('Class Teacher', 'Subject Teacher', 'Governing Body') then
    raise exception 'Invalid complaint route type: %', target_target_type;
  end if;

  if coalesce(trim(target_title), '') = '' or coalesce(trim(target_description), '') = '' then
    raise exception 'Complaint title and description are required.';
  end if;

  select *
  into student_row
  from public.students
  where profile_id = auth.uid()
  limit 1;

  if student_row.id is null then
    raise exception 'Student record not found for this account.';
  end if;

  if target_target_type = 'Class Teacher' then
    if target_target_role <> 'Teacher' then
      raise exception 'Class teacher complaints must target a teacher.';
    end if;

    if not exists (
      select 1
      from public.teachers teacher
      where teacher.home_section_id = student_row.section_id
        and teacher.profile_id::text = target_target_id
    ) then
      raise exception 'Selected class teacher is not assigned to this student section.';
    end if;
  elsif target_target_type = 'Subject Teacher' then
    if target_target_role <> 'Teacher' then
      raise exception 'Subject teacher complaints must target a teacher.';
    end if;

    if not exists (
      select 1
      from public.section_teacher_assignments assignment
      join public.teachers teacher on teacher.id = assignment.teacher_id
      where assignment.section_id = student_row.section_id
        and teacher.profile_id::text = target_target_id
        and assignment.role = 'Subject Teacher'
    ) then
      raise exception 'Selected subject teacher is not assigned to this student section.';
    end if;
  else
    if target_target_role <> 'Governing Body' then
      raise exception 'Governing body complaints must target governing body recipients.';
    end if;

    if not exists (
      select 1
      from public.profiles profile
      where profile.id::text = target_target_id
        and profile.role = 'Governing Body'
    ) then
      raise exception 'Selected governing body recipient is invalid.';
    end if;
  end if;

  insert into public.complaints (
    student_id,
    title,
    description,
    type,
    target_id,
    target_role,
    target_type,
    priority
  )
  values (
    auth.uid(),
    trim(target_title),
    trim(target_description),
    target_type,
    target_target_id,
    target_target_role,
    target_target_type,
    target_priority
  )
  returning * into created_row;

  return created_row;
end;
$$;

create or replace view public.complaint_details
with (security_invoker = true)
as
select
  complaint.id,
  complaint.student_id,
  coalesce(student.name, profile.name, 'Student') as student_name,
  coalesce(section.name, '') as class_name,
  coalesce(nullif(split_part(section.name, '-', 2), ''), section.name, '') as section,
  case when student.gender = 'Female' then 'Girls' else 'Boys' end as division,
  complaint.title,
  complaint.description,
  complaint.type,
  complaint.target_id,
  complaint.target_role,
  complaint.target_type,
  complaint.priority,
  complaint.status,
  complaint.created_at,
  complaint.response,
  complaint.resolved_at
from public.complaints complaint
left join public.profiles profile on profile.id = complaint.student_id
left join public.students student on student.profile_id = complaint.student_id
left join public.sections section on section.id = student.section_id;

grant select on public.complaint_details to authenticated;

alter table if exists public.complaints
drop column if exists student_name,
drop column if exists class_name,
drop column if exists section,
drop column if exists division;

create or replace function public.validate_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_subject text;
begin
  normalized_subject := public.normalize_subject_name(new.subject_name);

  if not exists (
    select 1
    from public.section_subjects subject
    where subject.section_id = new.section_id
      and lower(trim(subject.subject_name)) = lower(trim(normalized_subject))
  ) then
    raise exception 'Subject % is not configured for this section.', new.subject_name;
  end if;

  if not public.teacher_handles_timetable_subject(new.teacher_id, new.section_id, normalized_subject) then
    raise exception 'Selected teacher does not handle % for this section.', normalized_subject;
  end if;

  if not exists (
    select 1
    from public.teachers teacher
    where teacher.id = new.teacher_id
      and teacher.profile_id is not null
  ) then
    raise exception 'Selected teacher does not have a linked login profile.';
  end if;

  new.subject_name := normalized_subject;
  new.updated_at := timezone('utc', now());

  return new;
end;
$$;

drop policy if exists "timetable_entries_select_scoped" on public.timetable_entries;
create policy "timetable_entries_select_scoped"
on public.timetable_entries
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or exists (
    select 1
    from public.teachers teacher
    where teacher.id = public.timetable_entries.teacher_id
      and teacher.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.students student
    where student.profile_id = auth.uid()
      and student.section_id = public.timetable_entries.section_id
  )
);

drop index if exists public.timetable_entries_teacher_profile_idx;
alter table if exists public.timetable_entries
drop column if exists teacher_profile_id;

drop table if exists public.library_books;
drop table if exists public.librarians;
drop table if exists public.fee_records;
