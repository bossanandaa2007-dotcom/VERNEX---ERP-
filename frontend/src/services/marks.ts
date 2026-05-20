import { supabase } from '../lib/supabase';
import { fetchStudentByProfile } from './schoolData';

export type ExamType = 'Quarterly' | 'Half Yearly' | 'Annual';

export const MARK_EXAMS: ExamType[] = ['Quarterly', 'Half Yearly', 'Annual'];

export interface StudentMarkRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  sectionId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType: ExamType;
  teacherProfileId?: string | null;
}

export interface TeacherMarkSheetRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  sectionId: string;
  className: string;
  markId?: string;
  marks?: number;
  maxMarks: number;
}

export interface TeacherMarkScope {
  className: string;
  sectionId: string;
  subject: string;
}

export interface TeacherStudentSubjectPerformance {
  subject: string;
  markId?: string;
  marks?: number;
  maxMarks: number;
  highestMarks?: number;
  canEdit: boolean;
  isLocked: boolean;
}

export interface TeacherStudentPerformanceRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  sectionId: string;
  subjects: TeacherStudentSubjectPerformance[];
  completedSubjects: number;
  totalSubjects: number;
}

export interface StudentExamMarkCell {
  markId?: string;
  marks?: number;
  maxMarks: number;
  highestMarks?: number;
}

export interface StudentSubjectMarksOverview {
  subject: string;
  exams: Record<ExamType, StudentExamMarkCell>;
  completedExams: number;
}

export interface StudentMarksOverview {
  studentId: string;
  studentName: string;
  className: string;
  sectionId: string;
  subjects: StudentSubjectMarksOverview[];
  examHighs: Array<{
    examType: ExamType;
    highestMarks: number | null;
    completedSubjects: number;
    totalSubjects: number;
  }>;
}

export interface ClassExamMarkLock {
  id: string;
  sectionId: string;
  examType: ExamType;
  lockedAt: string;
  lockedBy?: string | null;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const fetchSubjectsForClass = async (className: string) => {
  const client = assertSupabase();
  const { data: section, error: sectionError } = await client
    .from('sections')
    .select('id')
    .eq('name', className)
    .single();

  if (sectionError) {
    throw sectionError;
  }

  const { data, error } = await client
    .from('section_subjects')
    .select('subject_name')
    .eq('section_id', (section as any).id)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => row.subject_name as string);
};

export const fetchTeacherMarkScopes = async (teacherProfileId: string): Promise<TeacherMarkScope[]> => {
  const client = assertSupabase();
  const [subjectAssignmentsRes, teacherRes] = await Promise.all([
    client
      .from('section_teacher_assignments')
      .select('section_id, subject, sections!inner(name)')
      .eq('teacher_profile_id', teacherProfileId)
      .eq('role', 'Subject Teacher')
      .order('subject', { ascending: true }),
    client
      .from('teachers')
      .select('home_section_id, home_section_subject, home_section:sections!teachers_home_section_id_fkey(name)')
      .eq('profile_id', teacherProfileId)
      .maybeSingle(),
  ]);

  if (subjectAssignmentsRes.error) {
    throw subjectAssignmentsRes.error;
  }

  if (teacherRes.error) {
    throw teacherRes.error;
  }

  const assignmentScopes = (subjectAssignmentsRes.data || []).map((row: any) => {
    const section = Array.isArray(row.sections) ? row.sections[0] : row.sections;
    return {
      className: section?.name as string,
      sectionId: row.section_id as string,
      subject: row.subject as string,
    };
  }).filter((row) => row.className && row.sectionId && row.subject);

  const teacherRow: any = teacherRes.data;
  const homeSection = teacherRow?.home_section ? (Array.isArray(teacherRow.home_section) ? teacherRow.home_section[0] : teacherRow.home_section) : null;
  const ownSubjects = teacherRow?.home_section_subject ? [teacherRow.home_section_subject] : [];
  const ownClassScopes = homeSection?.name && teacherRow?.home_section_id
    ? ownSubjects.map((subject: string) => ({
        className: homeSection.name as string,
        sectionId: teacherRow.home_section_id as string,
        subject,
      }))
    : [];

  return Array.from(
    new Map(
      [...assignmentScopes, ...ownClassScopes].map((scope) => [
        `${scope.sectionId}:${scope.subject.toLowerCase()}`,
        scope,
      ])
    ).values()
  );
};

export const fetchTeacherMarkSheet = async (className: string, subject: string, examType: ExamType) => {
  const client = assertSupabase();
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, name, roll_no, section_id, sections!inner(name)')
    .eq('sections.name', className)
    .order('roll_no', { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const { data: marks, error: marksError } = await client
    .from('student_marks')
    .select('id, student_id, marks, max_marks')
    .eq('class_name', className)
    .eq('subject_name', subject)
    .eq('exam_type', examType);

  if (marksError) {
    throw marksError;
  }

  const markMap = new Map((marks || []).map((mark: any) => [mark.student_id, mark]));

  return (students || []).map((student: any) => ({
    studentId: student.id,
    studentName: student.name,
    rollNo: student.roll_no,
    sectionId: student.section_id,
    className,
    markId: markMap.get(student.id)?.id,
    marks: markMap.get(student.id)?.marks,
    maxMarks: markMap.get(student.id)?.max_marks || 100,
  })) as TeacherMarkSheetRow[];
};

export const upsertStudentMark = async (row: {
  studentId: string;
  studentName: string;
  sectionId: string;
  className: string;
  subject: string;
  examType: ExamType;
  marks: number;
  maxMarks: number;
  teacherProfileId?: string;
}) => {
  const client = assertSupabase();
  const { error } = await client
    .from('student_marks')
    .upsert({
      student_id: row.studentId,
      student_name: row.studentName,
      section_id: row.sectionId,
      class_name: row.className,
      subject_name: row.subject,
      exam_type: row.examType,
      marks: row.marks,
      max_marks: row.maxMarks,
      teacher_profile_id: row.teacherProfileId || null,
    }, { onConflict: 'student_id,subject_name,exam_type' });

  if (error) {
    throw error;
  }
};

export const fetchClassExamMarkLocks = async (filters?: { sectionId?: string; examType?: ExamType | 'All' }) => {
  const client = assertSupabase();
  let query = client
    .from('class_exam_mark_locks')
    .select('id, section_id, exam_type, locked_at, locked_by')
    .order('locked_at', { ascending: false });

  if (filters?.sectionId) {
    query = query.eq('section_id', filters.sectionId);
  }

  if (filters?.examType && filters.examType !== 'All') {
    query = query.eq('exam_type', filters.examType);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    sectionId: row.section_id,
    examType: row.exam_type,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
  })) as ClassExamMarkLock[];
};

export const lockClassExamMarks = async (sectionId: string, examType: ExamType, adminProfileId?: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('class_exam_mark_locks')
    .upsert({
      section_id: sectionId,
      exam_type: examType,
      locked_by: adminProfileId || null,
      locked_at: new Date().toISOString(),
    }, { onConflict: 'section_id,exam_type' })
    .select('id, section_id, exam_type, locked_at, locked_by')
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    sectionId: data.section_id,
    examType: data.exam_type,
    lockedAt: data.locked_at,
    lockedBy: data.locked_by,
  } as ClassExamMarkLock;
};

export const unlockClassExamMarks = async (sectionId: string, examType: ExamType) => {
  const client = assertSupabase();
  const { error } = await client
    .from('class_exam_mark_locks')
    .delete()
    .eq('section_id', sectionId)
    .eq('exam_type', examType);

  if (error) {
    throw error;
  }
};

export const fetchTeacherStudentPerformance = async (
  teacherProfileId: string,
  examType: ExamType
): Promise<TeacherStudentPerformanceRow[]> => {
  const client = assertSupabase();
  const [scopes, teacherRes] = await Promise.all([
    fetchTeacherMarkScopes(teacherProfileId),
    client
      .from('teachers')
      .select('home_section_id')
      .eq('profile_id', teacherProfileId)
      .maybeSingle(),
  ]);

  if (teacherRes.error) {
    throw teacherRes.error;
  }

  const homeSectionId = (teacherRes.data as any)?.home_section_id as string | undefined;
  const sectionIds = Array.from(new Set([
    ...scopes.map((scope) => scope.sectionId).filter(Boolean),
    homeSectionId,
  ].filter(Boolean) as string[]));

  if (!sectionIds.length) {
    return [];
  }

  const [studentsRes, sectionSubjectsRes, marksRes, locksRes] = await Promise.all([
    client
      .from('students')
      .select('id, name, roll_no, section_id, sections!inner(name)')
      .in('section_id', sectionIds)
      .order('roll_no', { ascending: true }),
    client
      .from('section_subjects')
      .select('section_id, subject_name, sort_order')
      .in('section_id', sectionIds)
      .order('sort_order', { ascending: true }),
    client
      .from('student_marks')
      .select('id, student_id, student_name, class_name, section_id, subject_name, marks, max_marks, exam_type, teacher_profile_id')
      .in('section_id', sectionIds)
      .eq('exam_type', examType),
    client
      .from('class_exam_mark_locks')
      .select('section_id, exam_type')
      .in('section_id', sectionIds)
      .eq('exam_type', examType),
  ]);

  if (studentsRes.error) {
    throw studentsRes.error;
  }

  if (sectionSubjectsRes.error) {
    throw sectionSubjectsRes.error;
  }

  if (marksRes.error) {
    throw marksRes.error;
  }

  if (locksRes.error) {
    throw locksRes.error;
  }

  const subjectsBySection = new Map<string, string[]>();
  (sectionSubjectsRes.data || []).forEach((row: any) => {
    const current = subjectsBySection.get(row.section_id) || [];
    current.push(row.subject_name as string);
    subjectsBySection.set(row.section_id, current);
  });

  const markMap = new Map<string, any>();
  const highestBySectionSubject = new Map<string, number>();
  (marksRes.data || []).forEach((mark: any) => {
    markMap.set(`${mark.student_id}:${String(mark.subject_name).toLowerCase()}`, mark);
    const key = `${mark.section_id}:${String(mark.subject_name).toLowerCase()}`;
    const current = highestBySectionSubject.get(key);
    if (typeof mark.marks === 'number' && (typeof current !== 'number' || mark.marks > current)) {
      highestBySectionSubject.set(key, mark.marks);
    }
  });

  const editableScopeSet = new Set(scopes.map((scope) => `${scope.sectionId}:${scope.subject.toLowerCase()}`));
  const subjectVisibleScopeSet = new Set(scopes.map((scope) => `${scope.sectionId}:${scope.subject.toLowerCase()}`));
  const lockedSectionSet = new Set((locksRes.data || []).map((row: any) => `${row.section_id}:${row.exam_type}`));

  return (studentsRes.data || []).map((student: any) => {
    const section = Array.isArray(student.sections) ? student.sections[0] : student.sections;
    const subjectRows = (subjectsBySection.get(student.section_id) || []).filter((subject) =>
      student.section_id === homeSectionId ||
      subjectVisibleScopeSet.has(`${student.section_id}:${subject.toLowerCase()}`)
    ).map((subject) => {
      const mark = markMap.get(`${student.id}:${subject.toLowerCase()}`);
      const isLocked = lockedSectionSet.has(`${student.section_id}:${examType}`);
      return {
        subject,
        markId: mark?.id,
        marks: mark?.marks,
        maxMarks: mark?.max_marks || 100,
        highestMarks: highestBySectionSubject.get(`${student.section_id}:${subject.toLowerCase()}`),
        canEdit: !isLocked && editableScopeSet.has(`${student.section_id}:${subject.toLowerCase()}`),
        isLocked,
      };
    });
    const completedMarks = subjectRows.filter((subject) => typeof subject.marks === 'number');

    return {
      studentId: student.id,
      studentName: student.name,
      rollNo: student.roll_no,
      sectionId: student.section_id,
      className: section?.name || '',
      subjects: subjectRows,
      completedSubjects: completedMarks.length,
      totalSubjects: subjectRows.length,
    };
  });
};

export const fetchStudentMarksByProfile = async (profileId: string, examType?: ExamType) => {
  const student = await fetchStudentByProfile(profileId);
  if (!student) {
    return [];
  }

  const client = assertSupabase();
  const [{ data: sectionSubjects, error: sectionSubjectsError }, marksRes] = await Promise.all([
    client
      .from('section_subjects')
      .select('subject_name')
      .eq('section_id', student.sectionId),
    (() => {
      let query = client
        .from('student_marks')
        .select('id, student_id, student_name, class_name, section_id, subject_name, marks, max_marks, exam_type, teacher_profile_id')
        .eq('student_id', student.id)
        .order('subject_name', { ascending: true });

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      return query;
    })(),
  ]);

  if (sectionSubjectsError) {
    throw sectionSubjectsError;
  }

  const { data, error } = marksRes;
  if (error) {
    throw error;
  }

  const allowedSubjects = new Set((sectionSubjects || []).map((row: any) => String(row.subject_name).toLowerCase()));

  return (data || []).filter((row: any) => allowedSubjects.has(String(row.subject_name).toLowerCase())).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name,
    sectionId: row.section_id,
    subject: row.subject_name,
    marks: row.marks,
    maxMarks: row.max_marks,
    examType: row.exam_type,
    teacherProfileId: row.teacher_profile_id,
  })) as StudentMarkRecord[];
};

const createEmptyExamRecord = (): Record<ExamType, StudentExamMarkCell> => ({
  Quarterly: { maxMarks: 100 },
  'Half Yearly': { maxMarks: 100 },
  Annual: { maxMarks: 100 },
});

export const fetchStudentMarksOverview = async (profileId: string): Promise<StudentMarksOverview | null> => {
  const student = await fetchStudentByProfile(profileId);
  if (!student) {
    return null;
  }

  const client = assertSupabase();
  const [sectionRes, { data: sectionSubjects, error: sectionSubjectsError }, ownMarksRes, highsRes] = await Promise.all([
    client
      .from('sections')
      .select('name')
      .eq('id', student.sectionId)
      .maybeSingle(),
    client
      .from('section_subjects')
      .select('subject_name, sort_order')
      .eq('section_id', student.sectionId)
      .order('sort_order', { ascending: true }),
    client
      .from('student_marks')
      .select('id, student_id, subject_name, marks, max_marks, exam_type')
      .eq('student_id', student.id)
      .order('subject_name', { ascending: true }),
    client.rpc('get_section_subject_exam_highs', { target_section_id: student.sectionId }),
  ]);

  if (sectionSubjectsError) {
    throw sectionSubjectsError;
  }

  if (sectionRes.error) {
    throw sectionRes.error;
  }

  const { data: marks, error: marksError } = ownMarksRes;
  if (marksError) {
    throw marksError;
  }

  if (highsRes.error) {
    throw highsRes.error;
  }

  const markMap = new Map<string, any>();
  const highestMap = new Map<string, number>();
  (marks || []).forEach((mark: any) => {
    const key = `${String(mark.subject_name).toLowerCase()}:${mark.exam_type}`;
    markMap.set(key, mark);
  });

  (highsRes.data || []).forEach((row: any) => {
    const key = `${String(row.subject_name).toLowerCase()}:${row.exam_type}`;
    if (typeof row.highest_marks === 'number') {
      highestMap.set(key, row.highest_marks);
    }
  });

  const subjects = (sectionSubjects || []).map((row: any) => {
    const subject = row.subject_name as string;
    const exams = createEmptyExamRecord();
    MARK_EXAMS.forEach((examType) => {
      const mark = markMap.get(`${subject.toLowerCase()}:${examType}`);
      if (mark) {
        exams[examType] = {
          markId: mark.id,
          marks: mark.marks,
          maxMarks: mark.max_marks || 100,
          highestMarks: highestMap.get(`${subject.toLowerCase()}:${examType}`),
        };
      } else {
        exams[examType] = {
          ...exams[examType],
          highestMarks: highestMap.get(`${subject.toLowerCase()}:${examType}`),
        };
      }
    });
    const completedCells = MARK_EXAMS
      .map((examType) => exams[examType])
      .filter((cell) => typeof cell.marks === 'number');

    return {
      subject,
      exams,
      completedExams: completedCells.length,
    };
  });

  const examHighs = MARK_EXAMS.map((examType) => {
    const examCells = subjects
      .map((subject) => subject.exams[examType])
      .filter((cell) => typeof cell.highestMarks === 'number');

    return {
      examType,
      highestMarks: examCells.length ? Math.max(...examCells.map((cell) => cell.highestMarks || 0)) : null,
      completedSubjects: examCells.length,
      totalSubjects: subjects.length,
    };
  });

  return {
    studentId: student.id,
    studentName: student.name,
    className: (sectionRes.data as any)?.name || '',
    sectionId: student.sectionId,
    subjects,
    examHighs,
  };
};

export const fetchInstitutionMarks = async (filters?: { className?: string; examType?: ExamType | 'All'; search?: string }) => {
  const client = assertSupabase();
  let query = client
    .from('student_marks')
    .select('id, student_id, student_name, class_name, section_id, subject_name, marks, max_marks, exam_type, teacher_profile_id')
    .order('class_name', { ascending: true });

  if (filters?.className && filters.className !== 'All') {
    query = query.eq('class_name', filters.className);
  }

  if (filters?.examType && filters.examType !== 'All') {
    query = query.eq('exam_type', filters.examType);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const records = (data || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_name,
    sectionId: row.section_id,
    subject: row.subject_name,
    marks: row.marks,
    maxMarks: row.max_marks,
    examType: row.exam_type,
    teacherProfileId: row.teacher_profile_id,
  })) as StudentMarkRecord[];

  if (!filters?.search) {
    return records;
  }

  const search = filters.search.toLowerCase();
  return records.filter((record) =>
    record.studentName.toLowerCase().includes(search) ||
    record.subject.toLowerCase().includes(search)
  );
};
