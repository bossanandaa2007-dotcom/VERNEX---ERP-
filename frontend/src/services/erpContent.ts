import { supabase } from '../lib/supabase';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  class: string;
  deadline: string;
  description: string;
  driveUrl: string | null;
  teacher_id?: string | null;
  submissions: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id?: string | null;
  student_email: string;
  submitted_at: string;
  submissionUrl: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  class: string;
  sectionId?: string;
  teacherProfileId?: string | null;
  uploadDate: string;
  driveUrl: string | null;
}

export interface SchoolEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  type: string;
  targetAudience: string;
  status: string;
}

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  status: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  rollNo?: string;
  categoryId?: string;
  sectionId?: string;
  sectionName?: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  type: string;
  status: string;
  latestNote?: string;
}

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }

  return supabase;
};

export const fetchAssignments = async (classNames?: string[]) => {
  const client = assertSupabase();
  let query = client
    .from('assignments')
    .select('id, title, subject, class_name, deadline, description, drive_url, teacher_id, assignment_submissions(id, assignment_id, student_id, student_email, submitted_at, submission_url)')
    .order('deadline', { ascending: true });

  if (classNames?.length) {
    query = query.in('class_name', classNames);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    class: row.class_name,
    deadline: row.deadline,
    description: row.description,
    driveUrl: row.drive_url,
    teacher_id: row.teacher_id,
    submissions: (row.assignment_submissions || []).map((submission: any) => ({
      id: submission.id,
      assignment_id: submission.assignment_id,
      student_id: submission.student_id,
      student_email: submission.student_email,
      submitted_at: submission.submitted_at,
      submissionUrl: submission.submission_url,
    })),
  })) as Assignment[];
};

export const createAssignment = async (assignment: Omit<Assignment, 'id' | 'submissions'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('assignments')
    .insert({
      title: assignment.title,
      subject: assignment.subject,
      class_name: assignment.class,
      deadline: assignment.deadline,
      description: assignment.description,
      drive_url: assignment.driveUrl,
      teacher_id: assignment.teacher_id || null,
    })
    .select('id, title, subject, class_name, deadline, description, drive_url, teacher_id')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    class: data.class_name,
    deadline: data.deadline,
    description: data.description,
    driveUrl: data.drive_url,
    teacher_id: data.teacher_id,
    submissions: [],
  } as Assignment;
};

export const submitAssignment = async (assignmentId: string, studentId: string, studentEmail: string, submissionUrl: string) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: studentId,
      student_email: studentEmail,
      submitted_at: new Date().toISOString().split('T')[0],
      submission_url: submissionUrl,
    })
    .select('id, assignment_id, student_id, student_email, submitted_at, submission_url')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    assignment_id: data.assignment_id,
    student_id: data.student_id,
    student_email: data.student_email,
    submitted_at: data.submitted_at,
    submissionUrl: data.submission_url,
  } as AssignmentSubmission;
};

export const fetchStudyMaterials = async (classNames?: string[]) => {
  const client = assertSupabase();
  let query = client
    .from('study_materials')
    .select('id, title, subject, class_name, section_id, teacher_profile_id, upload_date, drive_url')
    .order('upload_date', { ascending: false });

  if (classNames?.length) {
    query = query.in('class_name', classNames);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    class: row.class_name,
    sectionId: row.section_id,
    teacherProfileId: row.teacher_profile_id,
    uploadDate: row.upload_date,
    driveUrl: row.drive_url,
  })) as StudyMaterial[];
};

export const createStudyMaterial = async (material: Omit<StudyMaterial, 'id' | 'uploadDate' | 'sectionId'>) => {
  const client = assertSupabase();
  const { data: section, error: sectionError } = await client
    .from('sections')
    .select('id')
    .eq('name', material.class)
    .single();

  if (sectionError) throw sectionError;

  const payload = {
    title: material.title,
    subject: material.subject,
    class_name: material.class,
    section_id: (section as any).id,
    teacher_profile_id: material.teacherProfileId || null,
    upload_date: new Date().toISOString().split('T')[0],
    drive_url: material.driveUrl,
  };

  const { error } = await client
    .from('study_materials')
    .upsert(payload, { onConflict: 'section_id,subject' });

  if (error) throw error;

  const { data, error: fetchError } = await client
    .from('study_materials')
    .select('id, title, subject, class_name, section_id, teacher_profile_id, upload_date, drive_url')
    .eq('section_id', (section as any).id)
    .eq('subject', material.subject)
    .single();

  if (fetchError) throw fetchError;

  return {
    id: data.id,
    title: data.title,
    subject: data.subject,
    class: data.class_name,
    sectionId: data.section_id,
    teacherProfileId: data.teacher_profile_id,
    uploadDate: data.upload_date,
    driveUrl: data.drive_url,
  } as StudyMaterial;
};

export const fetchEvents = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('events')
    .select('id, name, date, description, type, target_audience, status')
    .order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    description: row.description,
    type: row.type,
    targetAudience: row.target_audience,
    status: row.status,
  })) as SchoolEvent[];
};

export const createEvent = async (event: Omit<SchoolEvent, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('events')
    .insert({
      name: event.name,
      date: event.date,
      description: event.description,
      type: event.type,
      target_audience: event.targetAudience,
      status: event.status,
    })
    .select('id, name, date, description, type, target_audience, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    description: data.description,
    type: data.type,
    targetAudience: data.target_audience,
    status: data.status,
  } as SchoolEvent;
};

export const updateEvent = async (id: string, event: Omit<SchoolEvent, 'id'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('events')
    .update({
      name: event.name,
      date: event.date,
      description: event.description,
      type: event.type,
      target_audience: event.targetAudience,
      status: event.status,
    })
    .eq('id', id)
    .select('id, name, date, description, type, target_audience, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    description: data.description,
    type: data.type,
    targetAudience: data.target_audience,
    status: data.status,
  } as SchoolEvent;
};

export const deleteEvent = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client.from('events').delete().eq('id', id);
  if (error) throw error;
};

export const fetchBooks = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('library_books')
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .order('title', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    isbn: row.isbn,
    totalCopies: row.total_copies,
    availableCopies: row.available_copies,
    status: row.status,
  })) as LibraryBook[];
};

export const createBook = async (book: Omit<LibraryBook, 'id' | 'status'>) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('library_books')
    .insert({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      total_copies: book.totalCopies,
      available_copies: book.availableCopies,
      status: 'Available',
    })
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    author: data.author,
    category: data.category,
    isbn: data.isbn,
    totalCopies: data.total_copies,
    availableCopies: data.available_copies,
    status: data.status,
  } as LibraryBook;
};

export const issueBook = async (id: string) => {
  const client = assertSupabase();
  const { data: current, error: currentError } = await client
    .from('library_books')
    .select('available_copies')
    .eq('id', id)
    .single();

  if (currentError) throw currentError;
  if ((current.available_copies || 0) <= 0) throw new Error('No copies available.');

  const { error } = await client
    .from('library_books')
    .update({ available_copies: current.available_copies - 1 })
    .eq('id', id);

  if (error) throw error;
};

export const fetchFeeRecords = async (studentEmail?: string) => {
  const client = assertSupabase();
  let query = client
    .from('student_fee_records')
    .select(`
      id,
      student_id,
      amount,
      paid_amount,
      remaining_amount,
      due_date,
      status,
      students!inner (
        id,
        email,
        name,
        roll_no,
        category_id,
        section_id,
        sections (
          name
        )
      ),
      fee_categories!inner (
        id,
        name
      ),
      accountant_notes (
        note,
        updated_at
      )
    `)
    .order('due_date', { ascending: true });

  if (studentEmail) {
    query = query.eq('students.email', studentEmail);
  }

  const { data, error } = await query;
  if (!error) {
    return (data || []).map((row: any) => {
      const notes = [...(row.accountant_notes || [])].sort((left: any, right: any) =>
        String(right.updated_at || '').localeCompare(String(left.updated_at || ''))
      );

      return {
        id: row.id,
        studentId: row.student_id,
        studentEmail: row.students?.email,
        studentName: row.students?.name,
        rollNo: row.students?.roll_no,
        categoryId: row.students?.category_id,
        sectionId: row.students?.section_id,
        sectionName: row.students?.sections?.name,
        totalAmount: row.amount,
        paidAmount: row.paid_amount,
        pendingAmount: row.remaining_amount,
        dueDate: row.due_date,
        type: row.fee_categories?.name,
        status: row.status,
        latestNote: notes[0]?.note,
      };
    }) as FeeRecord[];
  }

  if (!String(error.message || '').includes('student_fee_records')) {
    throw error;
  }

  let legacyQuery = client
    .from('fee_records')
    .select(`
      id,
      student_id,
      student_email,
      total_amount,
      paid_amount,
      pending_amount,
      due_date,
      type,
      status,
      students (
        name,
        roll_no,
        category_id,
        section_id,
        sections (
          name
        )
      )
    `)
    .order('due_date', { ascending: true });

  if (studentEmail) {
    legacyQuery = legacyQuery.eq('student_email', studentEmail);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery;
  if (legacyError) throw legacyError;

  return (legacyData || []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentEmail: row.student_email,
    studentName: row.students?.name,
    rollNo: row.students?.roll_no,
    categoryId: row.students?.category_id,
    sectionId: row.students?.section_id,
    sectionName: row.students?.sections?.name,
    totalAmount: row.total_amount,
    paidAmount: row.paid_amount,
    pendingAmount: row.pending_amount,
    dueDate: row.due_date,
    type: row.type,
    status: row.status,
  })) as FeeRecord[];
};

export const updateFeeStatuses = async (recordIds: string[], status: 'Paid' | 'Pending' | 'Partial') => {
  const client = assertSupabase();
  const { error } = await client.rpc('bulk_update_fee_status', {
    record_ids: recordIds,
    new_status: status,
  });

  if (error) throw error;
};

export const saveAccountantNote = async (recordId: string, note: string) => {
  const client = assertSupabase();
  const { error } = await client.rpc('upsert_accountant_note', {
    target_fee_record_id: recordId,
    note_text: note,
  });

  if (error) throw error;
};

export const sendFeeReminders = async (recordIds: string[], message?: string) => {
  const client = assertSupabase();
  const { error } = await client.rpc('send_fee_reminders', {
    record_ids: recordIds,
    reminder_message: message || 'Please clear the pending fee at the earliest.',
    reminder_type: 'Fee Reminder',
  });

  if (error) throw error;
};
