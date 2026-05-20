import { supabase } from '../lib/supabase';
import type { AttendanceValue } from '../types/attendance';
import type { IStudent } from '../types/school';

export interface AttendancePreviewRow {
  studentName: string;
  attendance: AttendanceValue[];
}

export interface AttendanceSaveInput {
  sectionId: string;
  attendanceDate: string;
  students: AttendancePreviewRow[];
}

export interface AttendanceSheetRow extends IStudent {
  attendanceStatus: 'Present' | 'Absent';
}

export interface AttendanceTrendPoint {
  label: string;
  date: string;
  present: number;
  absent: number;
  presentCount: number;
  absentCount: number;
  total: number;
}

export interface AttendanceClassPoint {
  classId: string;
  pct: number;
  presentCount: number;
  total: number;
}

export interface AttendanceMonthlyPoint {
  month: string;
  records: number;
  attendanceRate: number;
}

export interface AttendanceOverview {
  trend: AttendanceTrendPoint[];
  classBreakdown: AttendanceClassPoint[];
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

interface AttendanceRecordRow {
  attendance_date: string;
  status: 'Present' | 'Absent';
  class_id: string;
  student_id: string;
  metadata?: {
    seeded?: boolean;
  } | null;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

const createDateRange = (days: number) => {
  const dates: string[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    dates.push(toIsoDate(current));
  }

  return dates;
};

const formatDayLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

const formatMonthLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short' });

const getRealRecords = (records: AttendanceRecordRow[]) =>
  records.filter((record) => !(record.metadata && record.metadata.seeded));

const normalizeTrend = (records: AttendanceRecordRow[], days: number) => {
  const dates = createDateRange(days);

  return dates.map((date) => {
    const dayRecords = records.filter((record) => record.attendance_date === date);
    const presentCount = dayRecords.filter((record) => record.status === 'Present').length;
    const absentCount = dayRecords.filter((record) => record.status === 'Absent').length;
    const total = dayRecords.length;

    return {
      label: formatDayLabel(date),
      date,
      present: total ? Math.round((presentCount / total) * 100) : 0,
      absent: total ? Math.round((absentCount / total) * 100) : 0,
      presentCount,
      absentCount,
      total,
    };
  });
};

const normalizeClassBreakdown = (records: AttendanceRecordRow[]) => {
  const classMap = new Map<string, { presentCount: number; total: number }>();

  records.forEach((record) => {
    const current = classMap.get(record.class_id) || { presentCount: 0, total: 0 };
    current.total += 1;
    if (record.status === 'Present') {
      current.presentCount += 1;
    }
    classMap.set(record.class_id, current);
  });

  return Array.from(classMap.entries())
    .map(([classId, stats]) => ({
      classId,
      pct: stats.total ? Math.round((stats.presentCount / stats.total) * 100) : 0,
      presentCount: stats.presentCount,
      total: stats.total,
    }))
    .sort((a, b) => a.classId.localeCompare(b.classId));
};

export const generateAttendancePreview = async (file: File) => {
  const client = assertSupabase();
  const formData = new FormData();
  formData.append('image', file);

  const { data, error } = await client.functions.invoke('ai-attendance', {
    body: formData,
  });

  if (error) {
    throw error;
  }

  return data as {
    preview: boolean;
    source: string;
    data: {
      students: AttendancePreviewRow[];
    };
  };
};

export const saveAttendanceConfirmation = async ({ sectionId, attendanceDate, students }: AttendanceSaveInput) => {
  const client = assertSupabase();
  const { data: studentRows, error: studentsError } = await client
    .from('students')
    .select('id, name, section_id, sections!inner(name)')
    .eq('sections.name', sectionId);

  if (studentsError) {
    throw studentsError;
  }

  const studentMap = new Map(
    (studentRows || []).map((student: any) => [String(student.name).trim().toLowerCase(), student])
  );

  const rows = students.map((student) => {
    const matchedStudent = studentMap.get(student.studentName.trim().toLowerCase());
    if (!matchedStudent) {
      throw new Error(`Could not match "${student.studentName}" to a student in ${sectionId}.`);
    }

    return {
      section_id: matchedStudent.section_id,
      class_id: sectionId,
      attendance_date: attendanceDate,
      student_id: matchedStudent.id,
      student_name: matchedStudent.name,
      status: student.attendance[student.attendance.length - 1] === 'P' ? 'Present' : 'Absent',
      source: 'AI',
      confidence_score: 0.95,
      metadata: {
        attendanceDays: student.attendance,
        engine: 'Gemini AI',
      },
    };
  });

  const { data, error } = await client
    .from('attendance_records')
    .upsert(rows, { onConflict: 'attendance_date,class_id,student_id' })
    .select();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchAttendanceSheet = async (classId: string, attendanceDate: string) => {
  const client = assertSupabase();
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, profile_id, name, email, roll_no, category_id, section_id, gender, dob, contact, parent_name, parent_contact, address, sections!inner(name)')
    .eq('sections.name', classId)
    .order('roll_no', { ascending: true });

  if (studentsError) {
    throw studentsError;
  }

  const studentRows = (students || []).map((student: any) => ({
    id: student.id,
    profileId: student.profile_id,
    name: student.name,
    email: student.email || undefined,
    rollNo: student.roll_no,
    categoryId: student.category_id,
    sectionId: student.section_id,
    gender: student.gender,
    dob: student.dob,
    contact: student.contact,
    parentName: student.parent_name,
    parentContact: student.parent_contact,
    address: student.address,
  })) as IStudent[];

  const { data: attendanceRows, error: attendanceError } = await client
    .from('attendance_records')
    .select('student_id, status')
    .eq('class_id', classId)
    .eq('attendance_date', attendanceDate);

  if (attendanceError) {
    throw attendanceError;
  }

  const attendanceMap = new Map((attendanceRows || []).map((row: any) => [row.student_id, row.status]));

  return studentRows.map((student) => ({
    ...student,
    attendanceStatus: (attendanceMap.get(student.id) as 'Present' | 'Absent') || 'Present',
  }));
};

export const upsertManualAttendance = async (classId: string, attendanceDate: string, students: AttendanceSheetRow[]) => {
  const client = assertSupabase();
  const payload = students.map((student) => ({
    class_id: classId,
    section_id: student.sectionId,
    attendance_date: attendanceDate,
    student_id: student.id,
    student_name: student.name,
    status: student.attendanceStatus,
    source: 'Manual',
    confidence_score: 1,
    metadata: {
      markedFrom: 'AttendanceDashboard',
    },
  }));

  const { error } = await client
    .from('attendance_records')
    .upsert(payload, { onConflict: 'attendance_date,class_id,student_id' });

  if (error) {
    throw error;
  }
};

export const fetchStudentAttendanceSummary = async (studentId: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('attendance_records')
    .select('attendance_date, status, class_id')
    .eq('student_id', studentId)
    .order('attendance_date', { ascending: false });

  if (error) {
    throw error;
  }

  const records = (data || []) as Array<{ attendance_date: string; status: 'Present' | 'Absent'; class_id: string }>;
  const presentCount = records.filter((record) => record.status === 'Present').length;
  const totalCount = records.length;
  const attendanceRate = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return {
    records,
    presentCount,
    absentCount: totalCount - presentCount,
    totalCount,
    attendanceRate,
  };
};

export const fetchAttendanceOverview = async (days = 7): Promise<AttendanceOverview> => {
  const client = assertSupabase();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));

  const { data, error } = await client
    .from('attendance_records')
    .select('attendance_date, status, class_id, student_id, metadata')
    .gte('attendance_date', toIsoDate(fromDate))
    .order('attendance_date', { ascending: true });

  if (error) {
    throw error;
  }

  const records = getRealRecords((data || []) as AttendanceRecordRow[]);
  const presentCount = records.filter((record) => record.status === 'Present').length;
  const absentCount = records.filter((record) => record.status === 'Absent').length;
  const totalRecords = records.length;

  return {
    trend: normalizeTrend(records, days),
    classBreakdown: normalizeClassBreakdown(records),
    totalRecords,
    presentCount,
    absentCount,
    attendanceRate: totalRecords ? Math.round((presentCount / totalRecords) * 100) : 0,
  };
};

export const fetchAttendanceMonthlyTrend = async (months = 6): Promise<AttendanceMonthlyPoint[]> => {
  const client = assertSupabase();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - (months - 1), 1);

  const { data, error } = await client
    .from('attendance_records')
    .select('attendance_date, status, metadata')
    .gte('attendance_date', toIsoDate(fromDate))
    .order('attendance_date', { ascending: true });

  if (error) {
    throw error;
  }

  const buckets = new Map<string, { present: number; total: number; date: string }>();

  getRealRecords((data || []) as AttendanceRecordRow[]).forEach((record: any) => {
    const monthKey = String(record.attendance_date).slice(0, 7);
    const current = buckets.get(monthKey) || { present: 0, total: 0, date: `${monthKey}-01` };
    current.total += 1;
    if (record.status === 'Present') {
      current.present += 1;
    }
    buckets.set(monthKey, current);
  });

  const monthsRange = Array.from({ length: months }, (_, index) => {
    const date = new Date(fromDate);
    date.setMonth(fromDate.getMonth() + index, 1);
    return toIsoDate(date).slice(0, 7);
  });

  return monthsRange.map((monthKey) => {
    const bucket = buckets.get(monthKey);
    const isoDate = bucket?.date || `${monthKey}-01`;
    const total = bucket?.total || 0;
    const present = bucket?.present || 0;

    return {
      month: formatMonthLabel(isoDate),
      records: total,
      attendanceRate: total ? Math.round((present / total) * 100) : 0,
    };
  });
};
