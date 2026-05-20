alter table public.study_materials
  alter column file_name drop not null;

alter table public.assignment_submissions
  alter column file_name drop not null;
