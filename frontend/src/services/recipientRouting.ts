import { supabase } from '../lib/supabase';

export type RecipientRouteType = 'Class Teacher' | 'Subject Teacher' | 'Governing Body';

export interface StudentRoutingContext {
  id: string;
  name: string;
  rollNo: string;
  categoryId: string;
  sectionId: string;
  className: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface RecipientOption {
  id: string;
  name: string;
  role: 'Teacher' | 'Governing Body';
  routeType: RecipientRouteType;
  subjects: string[];
  classNames: string[];
  department?: string;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const fetchStudentRoutingContext = async (profileId: string): Promise<StudentRoutingContext | null> => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, name, roll_no, category_id, section_id, gender, sections!inner(name)')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: (data as any).id,
    name: (data as any).name,
    rollNo: (data as any).roll_no,
    categoryId: (data as any).category_id,
    sectionId: (data as any).section_id,
    className: (data as any).sections?.name,
    gender: (data as any).gender,
  };
};

export const fetchRecipientsForStudentContext = async (
  context: StudentRoutingContext,
  options?: { includeSubjectTeachers?: boolean }
) => {
  const client = assertSupabase();
  const includeSubjectTeachers = options?.includeSubjectTeachers ?? true;
  const [classTeacherRes, assignmentsRes, governingRes] = await Promise.all([
    client
      .from('teachers')
      .select('profile_id, name, subject, subjects, category_id')
      .eq('home_section_id', context.sectionId)
      .maybeSingle(),
    includeSubjectTeachers
      ? client
          .from('section_teacher_assignments')
          .select('teacher_profile_id, role, subject, teachers!inner(name, profile_id, subjects, category_id)')
          .eq('section_id', context.sectionId)
          .eq('role', 'Subject Teacher')
          .order('subject', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    client
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'Governing Body')
      .order('name', { ascending: true }),
  ]);

  if (classTeacherRes.error) {
    throw classTeacherRes.error;
  }

  if (assignmentsRes.error) {
    throw assignmentsRes.error;
  }

  if (governingRes.error) {
    throw governingRes.error;
  }

  const assignmentRows = (assignmentsRes.data || []) as Array<{
    teacher_profile_id: string | null;
    role: RecipientRouteType;
    subject: string;
    teachers:
      | {
          name: string;
          profile_id: string | null;
          subjects: string[] | null;
          category_id: string;
        }
      | Array<{
          name: string;
          profile_id: string | null;
          subjects: string[] | null;
          category_id: string;
        }>;
  }>;

  const dedupedTeacherRecipients = new Map<string, RecipientOption>();
  const classTeacher = classTeacherRes.data as {
    profile_id: string | null;
    name: string;
    subject: string | null;
    subjects: string[] | null;
    category_id: string;
  } | null;

  if (classTeacher?.profile_id) {
    dedupedTeacherRecipients.set(`Class Teacher:${classTeacher.profile_id}`, {
      id: classTeacher.profile_id,
      name: classTeacher.name,
      role: 'Teacher',
      routeType: 'Class Teacher',
      subjects: classTeacher.subject ? [classTeacher.subject] : ['General'],
      classNames: [context.className],
      department: classTeacher.category_id,
    });
  }

  assignmentRows.forEach((assignment) => {
    const teacher = Array.isArray(assignment.teachers) ? assignment.teachers[0] : assignment.teachers;
    const profileId = assignment.teacher_profile_id || teacher?.profile_id;
    if (!profileId || !teacher) {
      return;
    }

    const key = `${assignment.role}:${profileId}`;
    const existing = dedupedTeacherRecipients.get(key);
    const subjects = Array.from(new Set([...(existing?.subjects || []), assignment.subject].filter(Boolean)));

    dedupedTeacherRecipients.set(key, {
      id: profileId,
      name: teacher.name,
      role: 'Teacher' as const,
      routeType: assignment.role,
      subjects,
      classNames: [context.className],
      department: teacher.category_id,
    });
  });

  const governingBodyRecipients = (governingRes.data || []).map((profile: any) => ({
    id: profile.id as string,
    name: (profile.name as string) || 'Governing Body',
    role: 'Governing Body' as const,
    routeType: 'Governing Body' as const,
    subjects: [],
    classNames: [],
  }));

  return [...dedupedTeacherRecipients.values(), ...governingBodyRecipients];
};
