import { supabase } from '../lib/supabase';
import type { IClassCategory, IClassSubjectGroup, ISection, ISectionTeacher, IStudent, ITeacher } from '../types/school';
import { getTodayInputDate, isFutureDateInput } from '../utils/dateLimits';

interface CategoryRow {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface SectionRow {
  id: string;
  category_id: string;
  name: string;
  strength: number;
  room_number: string | null;
}

interface TeacherRow {
  id: string;
  profile_id: string | null;
  home_section_id: string | null;
  home_section_subject: string | null;
  name: string;
  category_id: string;
  subject: string;
  subjects: string[] | null;
  qualification: string;
  experience: string;
  contact: string;
  email: string;
  home_section?: { name: string | null } | Array<{ name: string | null }> | null;
}

interface TeacherAssignmentRow {
  section_id: string;
  teacher_id: string;
  role: 'Subject Teacher';
  subject: string;
}

export interface FacultyAssignmentOption {
  type: 'class_teacher' | 'subject_teacher';
  sectionId: string;
  className: string;
  subject?: string;
  label: string;
}

export interface TeacherSubjectAssignmentDetail {
  sectionId: string;
  className: string;
  subject: string;
}

export interface TeacherManagementDetails {
  teacher: ITeacher;
  classTeacherOptions: Array<{ sectionId: string; className: string }>;
  currentClassTeacherSectionId: string | null;
  classTeacherSubjectOptionsBySection: Record<string, string[]>;
  currentSubjectAssignments: TeacherSubjectAssignmentDetail[];
  availableSubjectAssignments: FacultyAssignmentOption[];
}

interface StudentRow {
  id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  roll_no: string;
  category_id: string;
  section_id: string;
  gender: IStudent['gender'];
  dob: string;
  contact: string;
  parent_name: string;
  parent_contact: string;
  address: string;
}

interface SubjectGroupRow {
  id: string;
  category_id: string;
  name: string;
  description: string;
}

interface SubjectGroupSectionRow {
  group_id: string;
  section_id: string;
  sections?: { name: string | null } | Array<{ name: string | null }> | null;
}

interface SubjectGroupSubjectRow {
  group_id: string;
  subject_name: string;
  code: string;
  sort_order: number;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapCategory = (row: CategoryRow): IClassCategory => ({
  id: row.id,
  name: row.name,
  description: row.description,
  icon: row.icon,
});

const singleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const mapSection = (row: SectionRow, classTeacher: string, subjectTeachers: ISectionTeacher[] = []): ISection => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  classTeacher,
  subjectTeachers,
  strength: row.strength,
  roomNumber: row.room_number || undefined,
});

const addSectionSubjectTeacher = (
  subjectTeachersBySectionId: Map<string, ISectionTeacher[]>,
  sectionId: string,
  teacher: TeacherRow,
  subject: string | null | undefined
) => {
  const normalizedSubject = subject?.trim();
  if (!normalizedSubject) {
    return;
  }

  const current = subjectTeachersBySectionId.get(sectionId) || [];
  const existingIndex = current.findIndex(
    (entry) => entry.subject.toLowerCase() === normalizedSubject.toLowerCase()
  );
  const nextEntry: ISectionTeacher = {
    id: teacher.id,
    name: teacher.name,
    subject: normalizedSubject,
  };

  if (existingIndex >= 0) {
    current[existingIndex] = nextEntry;
  } else {
    current.push(nextEntry);
  }

  current.sort((left, right) => left.subject.localeCompare(right.subject));
  subjectTeachersBySectionId.set(sectionId, current);
};

const mapTeacher = (row: TeacherRow, subjectTeacherSections: string[], classTeacherSection: string): ITeacher => ({
  id: row.id,
  profileId: row.profile_id,
  name: row.name,
  category: row.category_id,
  subject: row.subject,
  subjects: row.subjects || (row.subject ? [row.subject] : []),
  homeSectionSubject: row.home_section_subject || undefined,
  qualification: row.qualification,
  experience: row.experience,
  contact: row.contact,
  email: row.email,
  assignedClass: classTeacherSection || subjectTeacherSections[0] || '',
  standards: Array.from(new Set([classTeacherSection, ...subjectTeacherSections].filter(Boolean))),
  classTeacherOf: classTeacherSection || undefined,
  subjectTeacherSections,
});

const mapStudent = (row: StudentRow): IStudent => ({
  id: row.id,
  profileId: row.profile_id,
  name: row.name,
  email: row.email || undefined,
  rollNo: row.roll_no,
  categoryId: row.category_id,
  sectionId: row.section_id,
  gender: row.gender,
  dob: row.dob,
  contact: row.contact,
  parentName: row.parent_name,
  parentContact: row.parent_contact,
  address: row.address,
});

const buildGeneratedStudentEmail = (student: Pick<IStudent, 'name' | 'rollNo'>) => {
  const slug = student.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return `${slug || 'student'}.${String(student.rollNo || 'id').toLowerCase()}@school.edu`;
};

const assertValidStudentDob = (student: Pick<IStudent, 'name' | 'dob'>) => {
  if (isFutureDateInput(student.dob)) {
    throw new Error(`Date of birth for ${student.name || 'student'} cannot be after ${getTodayInputDate()}.`);
  }
};

export const fetchSchoolData = async () => {
  const client = assertSupabase();
  const [categoriesRes, sectionsRes, teachersRes, assignmentsRes, studentsRes, subjectGroupsRes, subjectGroupSectionsRes, subjectGroupSubjectsRes] = await Promise.all([
    client.from('class_categories').select('id, name, description, icon').order('id', { ascending: true }),
    client.from('sections').select('id, category_id, name, strength, room_number').order('name', { ascending: true }),
    client.from('teachers').select('id, profile_id, home_section_id, home_section_subject, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)').order('name', { ascending: true }),
    client.from('section_teacher_assignments').select('section_id, teacher_id, role, subject').eq('role', 'Subject Teacher'),
    client.from('students').select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address').order('roll_no', { ascending: true }),
    client.from('class_subject_groups').select('id, category_id, name, description').order('name', { ascending: true }),
    client.from('class_subject_group_sections').select('group_id, section_id, sections!inner(name)').order('group_id', { ascending: true }),
    client.from('class_subject_group_subjects').select('group_id, subject_name, code, sort_order').order('sort_order', { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (studentsRes.error) throw studentsRes.error;
  if (subjectGroupsRes.error) throw subjectGroupsRes.error;
  if (subjectGroupSectionsRes.error) throw subjectGroupSectionsRes.error;
  if (subjectGroupSubjectsRes.error) throw subjectGroupSubjectsRes.error;

  const sections = (sectionsRes.data || []) as SectionRow[];
  const teachers = (teachersRes.data || []) as TeacherRow[];
  const assignments = (assignmentsRes.data || []) as TeacherAssignmentRow[];
  const subjectGroups = (subjectGroupsRes.data || []) as SubjectGroupRow[];
  const subjectGroupSections = (subjectGroupSectionsRes.data || []) as SubjectGroupSectionRow[];
  const subjectGroupSubjects = (subjectGroupSubjectsRes.data || []) as SubjectGroupSubjectRow[];

  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]));
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const classTeacherBySectionId = new Map<string, string>();
  const subjectSectionsByTeacherId = new Map<string, string[]>();
  const subjectTeachersBySectionId = new Map<string, ISectionTeacher[]>();

  teachers.forEach((teacher) => {
    if (teacher.home_section_id) {
      classTeacherBySectionId.set(teacher.home_section_id, teacher.name);
      addSectionSubjectTeacher(subjectTeachersBySectionId, teacher.home_section_id, teacher, teacher.home_section_subject);
    }
  });

  assignments.forEach((assignment) => {
    const sectionName = sectionNameById.get(assignment.section_id);
    const teacher = teacherById.get(assignment.teacher_id);

    if (!sectionName || !teacher) {
      return;
    }

    subjectSectionsByTeacherId.set(assignment.teacher_id, [
      ...(subjectSectionsByTeacherId.get(assignment.teacher_id) || []),
      sectionName,
    ]);

    addSectionSubjectTeacher(subjectTeachersBySectionId, assignment.section_id, teacher, assignment.subject);
  });

  const sectionNamesByGroupId = new Map<string, string[]>();
  subjectGroupSections.forEach((row) => {
    const section = singleRelation(row.sections);
    if (!section?.name) {
      return;
    }

    const current = sectionNamesByGroupId.get(row.group_id) || [];
    current.push(section.name);
    sectionNamesByGroupId.set(row.group_id, current);
  });

  const subjectsByGroupId = new Map<string, IClassSubjectGroup['subjects']>();
  subjectGroupSubjects.forEach((row) => {
    const current = subjectsByGroupId.get(row.group_id) || [];
    current.push({
      name: row.subject_name,
      code: row.code,
      sortOrder: row.sort_order,
    });
    subjectsByGroupId.set(row.group_id, current);
  });

  return {
    categories: (categoriesRes.data || []).map((row) => mapCategory(row as CategoryRow)),
    sections: sections.map((row) =>
      mapSection(row, classTeacherBySectionId.get(row.id) || 'Unassigned', subjectTeachersBySectionId.get(row.id) || [])
    ),
    teachers: teachers.map((row) =>
      mapTeacher(
        row,
        Array.from(new Set(subjectSectionsByTeacherId.get(row.id) || [])),
        singleRelation(row.home_section)?.name || ''
      )
    ),
    students: (studentsRes.data || []).map((row) => mapStudent(row as StudentRow)),
    curriculumGroups: subjectGroups.map((row) => ({
      id: row.id,
      name: row.name,
      categoryId: row.category_id,
      description: row.description,
      sectionNames: (sectionNamesByGroupId.get(row.id) || []).slice().sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
      subjects: (subjectsByGroupId.get(row.id) || []).slice().sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    })),
  };
};

export const createSectionRecord = async (section: Omit<ISection, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('sections')
    .insert({
      category_id: section.categoryId,
      name: section.name,
      strength: section.strength,
      room_number: section.roomNumber || null,
    })
    .select('id, category_id, name, strength, room_number')
    .single<SectionRow>();

  if (error) throw error;
  return mapSection(data, section.classTeacher);
};

export const deleteSectionRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('sections').delete().eq('id', id);
  if (error) throw error;
};

export const createTeacherRecord = async (teacher: Omit<ITeacher, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .insert({
      profile_id: teacher.profileId || null,
      name: teacher.name,
      category_id: teacher.category,
      subject: teacher.subject,
      subjects: teacher.subjects || (teacher.subject ? [teacher.subject] : []),
      qualification: teacher.qualification,
      experience: teacher.experience,
      contact: teacher.contact,
      email: teacher.email,
    })
    .select('id, profile_id, home_section_id, home_section_subject, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
    .single<TeacherRow>();

  if (error) throw error;

  const { error: provisionError } = await client.rpc('provision_teacher_login', { target_teacher_id: data.id });
  if (provisionError) throw provisionError;

  const assignedClassNames = Array.from(new Set([...(teacher.standards || []), teacher.assignedClass].filter(Boolean)));

  if (assignedClassNames.length) {
    const { data: sectionRows, error: sectionsError } = await client
      .from('sections')
      .select('id')
      .in('name', assignedClassNames);

    if (sectionsError) throw sectionsError;

      const assignmentRows = (sectionRows || []).map((section) => ({
        section_id: section.id,
        teacher_id: data.id,
        teacher_profile_id: data.profile_id,
        role: 'Subject Teacher',
        subject: teacher.subject,
      }));

    if (assignmentRows.length) {
      const { error: assignmentsError } = await client.from('section_teacher_assignments').insert(assignmentRows);
      if (assignmentsError) throw assignmentsError;
    }
  }

  const { data: refreshedTeacher, error: refreshedTeacherError } = await client
    .from('teachers')
    .select('id, profile_id, home_section_id, home_section_subject, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
    .eq('id', data.id)
    .single<TeacherRow>();

  if (refreshedTeacherError) throw refreshedTeacherError;

  return mapTeacher(refreshedTeacher, assignedClassNames, singleRelation(refreshedTeacher.home_section)?.name || '');
};

export const deleteTeacherRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('teachers').delete().eq('id', id);
  if (error) throw error;
};

export const fetchTeacherManagementDetails = async (teacherId: string): Promise<TeacherManagementDetails> => {
  const client = assertSupabase();
  const [teacherRes, sectionsRes, teachersRes, currentAssignmentsRes, sectionSubjectsRes, allAssignmentsRes] = await Promise.all([
    client
      .from('teachers')
      .select('id, profile_id, home_section_id, home_section_subject, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
      .eq('id', teacherId)
      .maybeSingle<TeacherRow>(),
    client
      .from('sections')
      .select('id, name')
      .order('name', { ascending: true }),
    client
      .from('teachers')
      .select('id, home_section_id'),
    client
      .from('section_teacher_assignments')
      .select('section_id, subject, sections!inner(name)')
      .eq('teacher_id', teacherId)
      .eq('role', 'Subject Teacher'),
    client
      .from('section_subjects')
      .select('section_id, subject_name, sort_order')
      .order('sort_order', { ascending: true }),
    client
      .from('section_teacher_assignments')
      .select('section_id, subject')
      .eq('role', 'Subject Teacher'),
  ]);

  if (teacherRes.error) throw teacherRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (currentAssignmentsRes.error) throw currentAssignmentsRes.error;
  if (sectionSubjectsRes.error) throw sectionSubjectsRes.error;
  if (allAssignmentsRes.error) throw allAssignmentsRes.error;
  if (!teacherRes.data) throw new Error('Teacher not found.');

  const teacherRow = teacherRes.data;
  const teacher = mapTeacher(
    teacherRow,
    (currentAssignmentsRes.data || []).map((assignment: any) => {
      const section = Array.isArray(assignment.sections) ? assignment.sections[0] : assignment.sections;
      return section?.name || '';
    }).filter(Boolean),
    singleRelation(teacherRow.home_section)?.name || ''
  );

  const currentClassTeacherSectionId = teacherRow.home_section_id;
  const occupiedHomeSections = new Set(
    ((teachersRes.data || []) as Array<{ id: string; home_section_id: string | null }>)
      .filter((row) => row.id !== teacherId)
      .map((row) => row.home_section_id)
      .filter(Boolean) as string[]
  );

  const classTeacherOptions = ((sectionsRes.data || []) as Array<{ id: string; name: string }>)
    .filter((section) => section.id === currentClassTeacherSectionId || !occupiedHomeSections.has(section.id))
    .map((section) => ({ sectionId: section.id, className: section.name }));

  const sectionSubjectTeacherMap = new Map<string, Set<string>>();
  ((allAssignmentsRes.data || []) as Array<{ section_id: string; subject: string }>).forEach((assignment) => {
    const current = sectionSubjectTeacherMap.get(assignment.section_id) || new Set<string>();
    current.add(assignment.subject.toLowerCase());
    sectionSubjectTeacherMap.set(assignment.section_id, current);
  });

  const classTeacherSubjectOptionsBySection = ((sectionsRes.data || []) as Array<{ id: string; name: string }>).reduce<Record<string, string[]>>((acc, section) => {
    const assignedSubjectTeachers = sectionSubjectTeacherMap.get(section.id) || new Set<string>();
    const availableSubjects = ((sectionSubjectsRes.data || []) as Array<{ section_id: string; subject_name: string }>)
      .filter((row) => row.section_id === section.id)
      .map((row) => row.subject_name)
      .filter((subject) =>
        !assignedSubjectTeachers.has(subject.toLowerCase()) ||
        (section.id === currentClassTeacherSectionId && subject.toLowerCase() === (teacherRow.home_section_subject || '').toLowerCase())
      );
    acc[section.id] = Array.from(new Set(availableSubjects));
    return acc;
  }, {});

  const currentSubjectAssignments = (currentAssignmentsRes.data || []).map((assignment: any) => {
    const section = Array.isArray(assignment.sections) ? assignment.sections[0] : assignment.sections;
    return {
      sectionId: assignment.section_id as string,
      className: section?.name || '',
      subject: assignment.subject as string,
    };
  });

  const occupiedSubjectSlots = new Set(
    ((allAssignmentsRes.data || []) as Array<{ section_id: string; subject: string }>)
      .map((row) => `${row.section_id}:${row.subject.toLowerCase()}`)
  );
  currentSubjectAssignments.forEach((assignment) => {
    occupiedSubjectSlots.delete(`${assignment.sectionId}:${assignment.subject.toLowerCase()}`);
  });

  const availableSubjectAssignments = ((sectionSubjectsRes.data || []) as Array<{ section_id: string; subject_name: string }>)
    .filter((row) =>
      !occupiedSubjectSlots.has(`${row.section_id}:${row.subject_name.toLowerCase()}`)
    )
    .map((row) => {
      const section = ((sectionsRes.data || []) as Array<{ id: string; name: string }>).find((item) => item.id === row.section_id);
      return section ? {
        type: 'subject_teacher' as const,
        sectionId: row.section_id,
        className: section.name,
        subject: row.subject_name,
        label: `${section.name} - ${row.subject_name}`,
      } : null;
    })
    .filter(Boolean) as FacultyAssignmentOption[];

  return {
    teacher,
    classTeacherOptions,
    currentClassTeacherSectionId,
    classTeacherSubjectOptionsBySection,
    currentSubjectAssignments,
    availableSubjectAssignments,
  };
};

export const updateTeacherRecord = async (teacherId: string, updates: {
  name: string;
  email: string;
  category: string;
  subject: string;
  subjects: string[];
  qualification: string;
  experience: string;
  contact: string;
  classTeacherSectionId: string | null;
  classTeacherSubject: string | null;
}) => {
  const client = assertSupabase();

  if (updates.classTeacherSectionId) {
    const { data: existingClassTeacher, error: existingClassTeacherError } = await client
      .from('teachers')
      .select('id')
      .eq('home_section_id', updates.classTeacherSectionId)
      .neq('id', teacherId)
      .maybeSingle();

    if (existingClassTeacherError) throw existingClassTeacherError;
    if (existingClassTeacher) {
      throw new Error('That class already has a class teacher.');
    }

    if (!updates.classTeacherSubject?.trim()) {
      throw new Error('Choose the class-teacher subject for that class.');
    }

    const { data: sectionSubjects, error: sectionSubjectsError } = await client
      .from('section_subjects')
      .select('subject_name')
      .eq('section_id', updates.classTeacherSectionId);

    if (sectionSubjectsError) throw sectionSubjectsError;
    const validSubjects = new Set((sectionSubjects || []).map((row: any) => String(row.subject_name).toLowerCase()));
    if (!validSubjects.has(updates.classTeacherSubject.toLowerCase())) {
      throw new Error('That subject does not belong to the selected class.');
    }

    const { data: existingSubjectTeacher, error: existingSubjectTeacherError } = await client
      .from('section_teacher_assignments')
      .select('id')
      .eq('section_id', updates.classTeacherSectionId)
      .eq('role', 'Subject Teacher')
      .eq('subject', updates.classTeacherSubject)
      .maybeSingle();

    if (existingSubjectTeacherError) throw existingSubjectTeacherError;
    if (existingSubjectTeacher) {
      throw new Error('That subject is already assigned as a subject-teacher slot in this class.');
    }
  }

  const normalizedSubjects = Array.from(new Set(updates.subjects.map((value) => value.trim()).filter(Boolean)));

  const { error } = await client
    .from('teachers')
    .update({
      name: updates.name,
      email: updates.email,
      category_id: updates.category,
      subject: updates.subject.trim(),
      subjects: normalizedSubjects,
      home_section_subject: updates.classTeacherSectionId ? updates.classTeacherSubject?.trim() || null : null,
      qualification: updates.qualification,
      experience: updates.experience,
      contact: updates.contact,
      home_section_id: updates.classTeacherSectionId,
    })
    .eq('id', teacherId);

  if (error) throw error;
};

export const addTeacherSubjectAssignment = async (teacherId: string, assignment: FacultyAssignmentOption) => {
  const client = assertSupabase();
  const { data: teacher, error: teacherError } = await client
    .from('teachers')
    .select('profile_id')
    .eq('id', teacherId)
    .maybeSingle();

  if (teacherError) throw teacherError;
  if (!teacher) throw new Error('Teacher not found.');
  if (!assignment.subject) throw new Error('Subject is required.');

  const { data: existingAssignment, error: existingAssignmentError } = await client
    .from('section_teacher_assignments')
    .select('id')
    .eq('section_id', assignment.sectionId)
    .eq('role', 'Subject Teacher')
    .eq('subject', assignment.subject)
    .maybeSingle();

  if (existingAssignmentError) throw existingAssignmentError;
  if (existingAssignment) throw new Error('That subject already has a teacher for this class.');

  const { error: insertError } = await client
    .from('section_teacher_assignments')
    .insert({
      section_id: assignment.sectionId,
      teacher_id: teacherId,
      teacher_profile_id: (teacher as any).profile_id,
      role: 'Subject Teacher',
      subject: assignment.subject,
    });

  if (insertError) throw insertError;
};

export const removeTeacherSubjectAssignment = async (teacherId: string, sectionId: string, subject: string) => {
  const client = assertSupabase();
  const { error } = await client
    .from('section_teacher_assignments')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('section_id', sectionId)
    .eq('role', 'Subject Teacher')
    .eq('subject', subject);

  if (error) throw error;
};

export const fetchTeacherAssignmentOptions = async (teacherId: string): Promise<FacultyAssignmentOption[]> => {
  const client = assertSupabase();
  const [teacherRes, sectionsRes, teachersRes, sectionSubjectsRes, assignmentsRes] = await Promise.all([
    client
      .from('teachers')
      .select('id, profile_id, home_section_id')
      .eq('id', teacherId)
      .maybeSingle(),
    client
      .from('sections')
      .select('id, name')
      .order('name', { ascending: true }),
    client
      .from('teachers')
      .select('id, home_section_id'),
    client
      .from('section_subjects')
      .select('section_id, subject_name, sort_order')
      .order('sort_order', { ascending: true }),
    client
      .from('section_teacher_assignments')
      .select('section_id, subject, role')
      .eq('role', 'Subject Teacher'),
  ]);

  if (teacherRes.error) throw teacherRes.error;
  if (sectionsRes.error) throw sectionsRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (sectionSubjectsRes.error) throw sectionSubjectsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const teacher = teacherRes.data as {
    id: string;
    profile_id: string | null;
    home_section_id: string | null;
  } | null;

  if (!teacher) {
    return [];
  }

  const occupiedHomeSections = new Set(
    ((teachersRes.data || []) as Array<{ id: string; home_section_id: string | null }>)
      .map((row) => row.home_section_id)
      .filter(Boolean) as string[]
  );

  const assignedSubjectSlots = new Set(
    ((assignmentsRes.data || []) as Array<{ section_id: string; subject: string }>)
      .map((row) => `${row.section_id}:${row.subject.toLowerCase()}`)
  );

  const classTeacherOptions = !teacher.home_section_id
    ? ((sectionsRes.data || []) as Array<{ id: string; name: string }>)
        .filter((section) => !occupiedHomeSections.has(section.id))
        .map((section) => ({
          type: 'class_teacher' as const,
          sectionId: section.id,
          className: section.name,
          label: `Class Teacher - ${section.name}`,
        }))
    : [];

  const subjectTeacherOptions = ((sectionSubjectsRes.data || []) as Array<{ section_id: string; subject_name: string }>)
    .filter((row) =>
      !assignedSubjectSlots.has(`${row.section_id}:${row.subject_name.toLowerCase()}`)
    )
    .map((row) => {
      const section = ((sectionsRes.data || []) as Array<{ id: string; name: string }>).find((item) => item.id === row.section_id);
      return section ? {
        type: 'subject_teacher' as const,
        sectionId: row.section_id,
        className: section.name,
        subject: row.subject_name,
        label: `Subject Teacher - ${section.name} - ${row.subject_name}`,
      } : null;
    })
    .filter(Boolean) as FacultyAssignmentOption[];

  return [...classTeacherOptions, ...subjectTeacherOptions];
};

export const assignTeacherToFacultySlot = async (
  teacherId: string,
  assignment: FacultyAssignmentOption
) => {
  const client = assertSupabase();
  const { data: teacher, error: teacherError } = await client
    .from('teachers')
    .select('id, profile_id, home_section_id')
    .eq('id', teacherId)
    .maybeSingle();

  if (teacherError) throw teacherError;
  if (!teacher) throw new Error('Teacher not found.');

  if (assignment.type === 'class_teacher') {
    if ((teacher as any).home_section_id) {
      throw new Error('This faculty member already owns a class.');
    }

    const { data: existingClassTeacher, error: existingClassTeacherError } = await client
      .from('teachers')
      .select('id')
      .eq('home_section_id', assignment.sectionId)
      .neq('id', teacherId)
      .maybeSingle();

    if (existingClassTeacherError) throw existingClassTeacherError;
    if (existingClassTeacher) {
      throw new Error('That class already has a class teacher.');
    }

    const { error: updateError } = await client
      .from('teachers')
      .update({ home_section_id: assignment.sectionId })
      .eq('id', teacherId);

    if (updateError) throw updateError;
    return;
  }

  if (!assignment.subject) {
    throw new Error('Subject is required.');
  }

  const { data: existingAssignment, error: existingAssignmentError } = await client
    .from('section_teacher_assignments')
    .select('id')
    .eq('section_id', assignment.sectionId)
    .eq('role', 'Subject Teacher')
    .eq('subject', assignment.subject)
    .maybeSingle();

  if (existingAssignmentError) throw existingAssignmentError;
  if (existingAssignment) {
    throw new Error('That subject already has a teacher for this class.');
  }

  const { error: insertError } = await client
    .from('section_teacher_assignments')
    .insert({
      section_id: assignment.sectionId,
      teacher_id: teacherId,
      teacher_profile_id: (teacher as any).profile_id,
      role: 'Subject Teacher',
      subject: assignment.subject,
    });

  if (insertError) throw insertError;
};

export const createStudentRecord = async (student: Omit<IStudent, 'id'>) => {
  const client = assertSupabase();
  assertValidStudentDob(student);
  const studentEmail = student.email?.trim() || buildGeneratedStudentEmail(student);
  const { data, error } = await client
    .from('students')
    .insert({
      profile_id: student.profileId || null,
      name: student.name,
      email: studentEmail,
      roll_no: student.rollNo,
      category_id: student.categoryId,
      section_id: student.sectionId,
      gender: student.gender,
      dob: student.dob,
      contact: student.contact,
      parent_name: student.parentName,
      parent_contact: student.parentContact,
      address: student.address,
    })
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .single<StudentRow>();

  if (error) throw error;

  const { error: provisionError } = await client.rpc('provision_student_login', { target_student_id: data.id });
  if (provisionError) throw provisionError;

  const { data: refreshedStudent, error: refreshedStudentError } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .eq('id', data.id)
    .single<StudentRow>();

  if (refreshedStudentError) throw refreshedStudentError;

  return mapStudent(refreshedStudent);
};

export const createStudentRecords = async (students: Array<Omit<IStudent, 'id'>>) => {
  const client = assertSupabase();
  students.forEach(assertValidStudentDob);
  const rows = students.map((student) => ({
    profile_id: student.profileId || null,
    name: student.name,
    email: (student.email?.trim() || buildGeneratedStudentEmail(student)).toLowerCase(),
    roll_no: student.rollNo,
    category_id: student.categoryId,
    section_id: student.sectionId,
    gender: student.gender,
    dob: student.dob,
    contact: student.contact,
    parent_name: student.parentName,
    parent_contact: student.parentContact,
    address: student.address,
  }));

  const { data, error } = await client
    .from('students')
    .insert(rows)
    .select('id');

  if (error) throw error;

  const createdIds = (data || []).map((row) => row.id);
  if (!createdIds.length) {
    return [];
  }

  const { data: refreshedStudents, error: refreshedStudentsError } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .in('id', createdIds)
    .order('roll_no', { ascending: true });

  if (refreshedStudentsError) throw refreshedStudentsError;

  return (refreshedStudents || []).map((row) => mapStudent(row as StudentRow));
};

export const deleteStudentRecord = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('students').delete().eq('id', id);
  if (error) throw error;
};

export const fetchStudentsByClass = async (className: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address, sections!inner(name)')
    .eq('sections.name', className)
    .order('roll_no', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) =>
    mapStudent({
      id: (row as any).id,
      profile_id: (row as any).profile_id,
      name: (row as any).name,
      email: (row as any).email,
      roll_no: (row as any).roll_no,
      category_id: (row as any).category_id,
      section_id: (row as any).section_id,
      gender: (row as any).gender,
      dob: (row as any).dob,
      contact: (row as any).contact,
      parent_name: (row as any).parent_name,
      parent_contact: (row as any).parent_contact,
      address: (row as any).address,
    })
  );
};

export const fetchTeacherByProfile = async (profileId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('teachers')
    .select('id, profile_id, home_section_id, home_section_subject, name, category_id, subject, subjects, qualification, experience, contact, email, home_section:sections!teachers_home_section_id_fkey(name)')
    .eq('profile_id', profileId)
    .maybeSingle<TeacherRow>();

  if (error) throw error;
  if (!data) {
    return null;
  }

  const { data: assignments, error: assignmentsError } = await client
    .from('section_teacher_assignments')
    .select('section_id, role, sections!inner(name)')
    .eq('teacher_id', data.id)
    .eq('role', 'Subject Teacher');

  if (assignmentsError) throw assignmentsError;

  const assignedSections: string[] = [];

  (assignments || []).forEach((assignment: any) => {
    const sectionName = Array.isArray(assignment.sections) ? assignment.sections[0]?.name : assignment.sections?.name;
    if (!sectionName) {
      return;
    }

    assignedSections.push(sectionName);
  });

  return mapTeacher(data, Array.from(new Set(assignedSections)), singleRelation(data.home_section)?.name || '');
};

export const fetchStudentByProfile = async (profileId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address')
    .eq('profile_id', profileId)
    .maybeSingle<StudentRow>();

  if (error) throw error;
  return data ? mapStudent(data) : null;
};
