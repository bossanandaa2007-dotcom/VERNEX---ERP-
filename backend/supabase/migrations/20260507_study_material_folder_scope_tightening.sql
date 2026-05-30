alter table public.study_materials
  add column if not exists section_id uuid references public.sections (id) on delete cascade;

alter table public.study_materials
  add column if not exists teacher_profile_id uuid references public.profiles (id) on delete set null;

delete from public.study_materials;

create unique index if not exists study_materials_section_subject_uidx
on public.study_materials (section_id, subject);

drop policy if exists "study_materials_select_authenticated" on public.study_materials;
drop policy if exists "study_materials_select_scoped" on public.study_materials;
drop policy if exists "study_materials_manage_teacher_admin" on public.study_materials;

create policy "study_materials_select_scoped"
on public.study_materials
for select
to authenticated
using (
  public.current_profile_role() in ('Admin', 'Accountant', 'Governing Body')
  or public.study_materials.class_name = public.current_student_class_name()
  or public.study_materials.class_name = any(public.current_teacher_class_names())
);

create policy "study_materials_manage_teacher_admin"
on public.study_materials
for all
to authenticated
using (
  public.current_profile_role() = 'Admin'
  or (
    public.study_materials.teacher_profile_id = auth.uid()
    and exists (
      select 1
      from public.sections sec
      where sec.id = public.study_materials.section_id
        and sec.name = public.study_materials.class_name
    )
    and public.teacher_handles_class_subject(
      public.study_materials.section_id,
      public.study_materials.class_name,
      public.study_materials.subject
    )
  )
)
with check (
  public.current_profile_role() = 'Admin'
  or (
    teacher_profile_id = auth.uid()
    and exists (
      select 1
      from public.sections sec
      where sec.id = section_id
        and sec.name = class_name
    )
    and public.teacher_handles_class_subject(
      section_id,
      class_name,
      subject
    )
  )
);
