import { supabase } from '../lib/supabase';

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNumber: string;
  teacherId: string;
  teacherName: string;
  recipientType: 'Class Teacher';
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveRequestStatus;
  teacherRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface LeaveRequestRow {
  id: string;
  student_profile_id: string;
  student_name: string;
  class_name: string;
  roll_number: string;
  teacher_profile_id: string;
  teacher_name: string;
  recipient_type: 'Class Teacher';
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveRequestStatus;
  teacher_remarks: string | null;
  created_at: string;
  updated_at: string;
}

type LeaveRequestFilters = {
  studentId?: string;
  teacherId?: string;
};

export type CreateLeaveRequestInput = {
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const LEAVE_SELECT =
  'id, student_profile_id, student_name, class_name, roll_number, teacher_profile_id, teacher_name, recipient_type, start_date, end_date, reason, status, teacher_remarks, created_at, updated_at';

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

const mapLeaveRequestRow = (row: LeaveRequestRow): LeaveRequest => ({
  id: row.id,
  studentId: row.student_profile_id,
  studentName: row.student_name,
  className: row.class_name,
  rollNumber: row.roll_number,
  teacherId: row.teacher_profile_id,
  teacherName: row.teacher_name,
  recipientType: row.recipient_type,
  startDate: row.start_date,
  endDate: row.end_date,
  reason: row.reason,
  status: row.status,
  teacherRemarks: row.teacher_remarks || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchLeaveRequests = async (filters: LeaveRequestFilters = {}) => {
  const client = assertSupabase();
  let query = client.from('leave_requests').select(LEAVE_SELECT).order('created_at', { ascending: false });

  if (filters.studentId) {
    query = query.eq('student_profile_id', filters.studentId);
  }

  if (filters.teacherId) {
    query = query.eq('teacher_profile_id', filters.teacherId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data || []) as LeaveRequestRow[]).map(mapLeaveRequestRow);
};

export const createLeaveRequest = async (leaveRequest: CreateLeaveRequestInput) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('submit_leave_request', {
    target_teacher_profile_id: leaveRequest.teacherId,
    target_teacher_name: leaveRequest.teacherName,
    target_recipient_type: 'Class Teacher',
    target_start_date: leaveRequest.startDate,
    target_end_date: leaveRequest.endDate,
    target_reason: leaveRequest.reason,
  });

  if (error) {
    throw error;
  }

  return mapLeaveRequestRow(data as LeaveRequestRow);
};

export const resolveLeaveRequest = async (
  leaveRequestId: string,
  status: Exclude<LeaveRequestStatus, 'Pending'>,
  remarks?: string
) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('resolve_leave_request', {
    target_request_id: leaveRequestId,
    next_status: status,
    next_remarks: remarks || null,
  });

  if (error) {
    throw error;
  }

  return mapLeaveRequestRow(data as LeaveRequestRow);
};
