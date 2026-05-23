import { supabase } from '../lib/supabase';
import type { AttendanceValue } from '../types/attendance';
import type { IStudent } from '../types/school';
import { isAttendanceDateEditable, isFutureDateInput } from '../utils/dateLimits';

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
  liveRegistry: AttendanceRegistryRow[];
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

export type AttendanceOverviewRange = 'today' | 'week' | 'month' | 'twoMonthsAgo' | 'overall';

export interface AttendanceRegistryRow {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  attendanceDate: string;
  status: 'Present' | 'Absent';
  createdAt: string;
}

interface AttendanceRecordRow {
  id?: string;
  attendance_date: string;
  status: 'Present' | 'Absent';
  class_id: string;
  student_id: string;
  student_name?: string;
  created_at?: string;
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

const createDateRangeBetween = (startDate: Date, endDate: Date) => {
  const dates: string[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const formatDayLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

const formatMonthLabel = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short' });

const getRealRecords = (records: AttendanceRecordRow[]) =>
  records.filter((record) => !(record.metadata && record.metadata.seeded));

const normalizeTrendForDates = (records: AttendanceRecordRow[], dates: string[]) =>
  dates.map((date) => {
    const dayRecords = records.filter((record) => record.attendance_date === date);
    const presentCount = dayRecords.filter((record) => record.status === 'Present').length;
    const absentCount = dayRecords.filter((record) => record.status === 'Absent').length;
    const total = dayRecords.length;

    // compute percentages with one decimal place to avoid small ratios rounding to 0
    const presentPct = total ? Math.round((presentCount / total) * 1000) / 10 : 0;
    const absentPct = total ? Math.round((absentCount / total) * 1000) / 10 : 0;

    return {
      label: formatDayLabel(date),
      date,
      present: presentPct,
      absent: absentPct,
      presentCount,
      absentCount,
      total,
    };
  });

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

const getAttendanceWindow = (range: AttendanceOverviewRange, days: number) => {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);

  // 'overall' requests the full history: set a very early start date
  if (range === 'overall') {
    // Use a safe historical date; the DB likely has no records before year 2000.
    return { startDate: new Date(2000, 0, 1), endDate };
  }

  if (range === 'today') {
    return { startDate, endDate };
  }

  if (range === 'month') {
    startDate.setDate(today.getDate() - 29);
    return { startDate, endDate };
  }

  if (range === 'twoMonthsAgo') {
    startDate.setMonth(today.getMonth() - 2, 1);
    endDate.setMonth(today.getMonth() - 1, 0);
    return { startDate, endDate };
  }

  startDate.setDate(today.getDate() - (days - 1));
  return { startDate, endDate };
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
  if (isFutureDateInput(attendanceDate)) {
    throw new Error('Attendance cannot be marked for a future date.');
  }

  if (!isAttendanceDateEditable(attendanceDate)) {
    throw new Error('Attendance for this date is frozen and can no longer be changed.');
  }

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

export const fetchAttendanceOverview = async (
  days = 7,
  range: AttendanceOverviewRange = 'week'
): Promise<AttendanceOverview> => {
  const client = assertSupabase();
  const { startDate, endDate } = getAttendanceWindow(range, days);
  const dateRange = createDateRangeBetween(startDate, endDate);

  const { data, error } = await client
    .from('attendance_records')
    .select('id, attendance_date, status, class_id, student_id, student_name, created_at, metadata')
    .gte('attendance_date', toIsoDate(startDate))
    .lte('attendance_date', toIsoDate(endDate))
    .order('attendance_date', { ascending: true });

  if (error) {
    throw error;
  }

  const records = getRealRecords((data || []) as AttendanceRecordRow[]);
  const presentCount = records.filter((record) => record.status === 'Present').length;
  const absentCount = records.filter((record) => record.status === 'Absent').length;
  const totalRecords = records.length;

  return {
    trend: normalizeTrendForDates(records, dateRange),
    classBreakdown: normalizeClassBreakdown(records),
    liveRegistry: [...records]
      .sort((a, b) =>
        String(b.created_at || b.attendance_date).localeCompare(String(a.created_at || a.attendance_date))
      )
      .slice(0, 8)
      .map((record) => ({
        id: record.id || `${record.attendance_date}-${record.class_id}-${record.student_id}`,
        studentId: record.student_id,
        studentName: record.student_name || 'Student',
        classId: record.class_id,
        attendanceDate: record.attendance_date,
        status: record.status,
        createdAt: record.created_at || record.attendance_date,
      })),
    totalRecords,
    presentCount,
    absentCount,
    // attendanceRate with one decimal to avoid showing 0 for very small ratios
    attendanceRate: totalRecords ? Math.round((presentCount / totalRecords) * 1000) / 10 : 0,
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
