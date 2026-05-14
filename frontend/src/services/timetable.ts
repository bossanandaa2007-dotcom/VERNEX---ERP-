import { supabase } from '../lib/supabase';
import { fetchStudentByProfile } from './schoolData';

export const TIMETABLE_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export const TIMETABLE_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface TimetableEntry {
  id: string;
  sectionId: string;
  sectionName: string;
  teacherId: string;
  teacherName: string;
  teacherProfileId: string | null;
  subject: string;
  dayOfWeek: number;
  periodNumber: number;
  startTime?: string | null;
  endTime?: string | null;
  roomNumber?: string | null;
  notes?: string | null;
}

export interface TimetableWrite {
  sectionId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: number;
  periodNumber: number;
}

interface TimetableEntryRow {
  id: string;
  section_id: string;
  teacher_id: string;
  teacher_profile_id: string | null;
  subject_name: string;
  day_of_week: number;
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  room_number: string | null;
  notes: string | null;
  sections?: { name: string | null } | Array<{ name: string | null }> | null;
  teachers?: { name: string | null } | Array<{ name: string | null }> | null;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const singleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const mapTimetableEntry = (row: TimetableEntryRow): TimetableEntry => ({
  id: row.id,
  sectionId: row.section_id,
  sectionName: singleRelation(row.sections)?.name || '',
  teacherId: row.teacher_id,
  teacherName: singleRelation(row.teachers)?.name || '',
  teacherProfileId: row.teacher_profile_id,
  subject: row.subject_name,
  dayOfWeek: row.day_of_week,
  periodNumber: row.period_number,
  startTime: row.start_time,
  endTime: row.end_time,
  roomNumber: row.room_number,
  notes: row.notes,
});

export const fetchTimetableEntries = async (filters?: { sectionId?: string; teacherProfileId?: string }) => {
  const client = assertSupabase();
  let query = client
    .from('timetable_entries')
    .select('id, section_id, teacher_id, teacher_profile_id, subject_name, day_of_week, period_number, start_time, end_time, room_number, notes, sections!inner(name), teachers!inner(name)')
    .order('day_of_week', { ascending: true })
    .order('period_number', { ascending: true });

  if (filters?.sectionId) {
    query = query.eq('section_id', filters.sectionId);
  }

  if (filters?.teacherProfileId) {
    query = query.eq('teacher_profile_id', filters.teacherProfileId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => mapTimetableEntry(row as TimetableEntryRow));
};

export const fetchStudentTimetableEntries = async (profileId: string) => {
  const student = await fetchStudentByProfile(profileId);
  if (!student) {
    return [];
  }

  return fetchTimetableEntries({ sectionId: student.sectionId });
};

export const saveTimetableEntry = async (entry: TimetableWrite) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('timetable_entries')
    .upsert({
      section_id: entry.sectionId,
      teacher_id: entry.teacherId,
      subject_name: entry.subject,
      day_of_week: entry.dayOfWeek,
      period_number: entry.periodNumber,
    }, { onConflict: 'section_id,day_of_week,period_number' })
    .select('id, section_id, teacher_id, teacher_profile_id, subject_name, day_of_week, period_number, start_time, end_time, room_number, notes, sections!inner(name), teachers!inner(name)')
    .single<TimetableEntryRow>();

  if (error) throw error;
  return mapTimetableEntry(data);
};

export const deleteTimetableEntry = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('timetable_entries').delete().eq('id', id);
  if (error) throw error;
};
