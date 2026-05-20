alter table public.assignments
  add column if not exists drive_url text;

alter table public.study_materials
  add column if not exists drive_url text;

alter table public.assignment_submissions
  add column if not exists submission_url text;

update public.study_materials
set drive_url = file_name
where drive_url is null
  and file_name ~* '^https://(drive|docs)\.google\.com/';

update public.assignment_submissions
set submission_url = file_name
where submission_url is null
  and file_name ~* '^https://(drive|docs)\.google\.com/';
