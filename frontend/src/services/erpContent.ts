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

export interface LibraryStudent {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  categoryId?: string | null;
  sectionId?: string | null;
  sectionName?: string;
  grade?: string;
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

const LIBRARIAN_BOOKS_TABLE = 'librarian_books';

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ');

const defaultLibraryDueDate = () => {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 21);
  return dueDate.toISOString().slice(0, 10);
};

const mapLibraryBook = (row: any): LibraryBook => ({
  id: row.id,
  title: row.title,
  author: row.author,
  category: row.category,
  isbn: row.isbn,
  totalCopies: row.total_copies,
  availableCopies: row.available_copies,
  status: row.status,
});

export const fetchAssignments = async (classNames?: string[]) => {
  const client = assertSupabase();
  let query = client
    .from('assignments')
    .select('id, title, subject, class_name, deadline, description, drive_url, teacher_id, assignment_submissions(id, assignment_id, student_id, submitted_at, submission_url)')
    .order('deadline', { ascending: true });

  if (classNames?.length) {
    query = query.in('class_name', classNames);
  }

  const { data, error } = await query;
  if (error) throw error;

  const studentProfileIds = Array.from(new Set(
    (data || []).flatMap((row: any) =>
      (row.assignment_submissions || []).map((submission: any) => submission.student_id).filter(Boolean)
    )
  ));
  const profileEmailMap = new Map<string, string>();

  if (studentProfileIds.length) {
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, email')
      .in('id', studentProfileIds);

    if (profilesError) throw profilesError;

    (profiles || []).forEach((profile: any) => {
      profileEmailMap.set(profile.id, profile.email);
    });
  }

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
      student_email: profileEmailMap.get(submission.student_id) || 'Student',
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
      submitted_at: new Date().toISOString().split('T')[0],
      submission_url: submissionUrl,
    })
    .select('id, assignment_id, student_id, submitted_at, submission_url')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    assignment_id: data.assignment_id,
    student_id: data.student_id,
    student_email: studentEmail,
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
    .from(LIBRARIAN_BOOKS_TABLE)
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .order('title', { ascending: true });

  if (error) throw error;

  return (data || []).map(mapLibraryBook) as LibraryBook[];
};

export const createBook = async (book: Omit<LibraryBook, 'id' | 'status'>) => {
  const client = assertSupabase();
  const isbn = book.isbn?.trim() || `LOCAL-${crypto.randomUUID()}`;
  const { data, error } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .insert({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn,
      total_copies: book.totalCopies,
      available_copies: book.availableCopies,
      status: 'Available',
    })
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .single();

  if (error) throw error;

  return mapLibraryBook(data);
};

export const updateBook = async (id: string, book: Omit<LibraryBook, 'id' | 'status'>) => {
  const client = assertSupabase();
  const isbn = book.isbn?.trim() || `LOCAL-${id}`;
  const { data, error } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .update({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn,
      total_copies: book.totalCopies,
      available_copies: book.availableCopies,
    })
    .eq('id', id)
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .single();

  if (error) throw error;

  return mapLibraryBook(data);
};

export const findOrCreateLibraryBookByTitle = async (rawTitle: string) => {
  const client = assertSupabase();
  const title = normalizeTitle(rawTitle);
  if (!title) throw new Error('Enter a book title.');

  const { data: matches, error: matchError } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .select('id, title, author, category, isbn, total_copies, available_copies, status')
    .ilike('title', title);

  if (matchError) throw matchError;

  const existing = (matches || []).find((book: any) => normalizeTitle(book.title).toLowerCase() === title.toLowerCase());
  if (existing) return mapLibraryBook(existing);

  return createBook({
    title,
    author: 'Unknown',
    category: 'General',
    isbn: '',
    totalCopies: 1,
    availableCopies: 1,
  });
};

export const deleteBook = async (id: string) => {
  const client = assertSupabase();
  const { error } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const issueBook = async (id: string) => {
  const client = assertSupabase();
  const { data: current, error: currentError } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .select('available_copies')
    .eq('id', id)
    .single();

  if (currentError) throw currentError;
  if ((current.available_copies || 0) <= 0) throw new Error('No copies available.');

  const { error } = await client
    .from(LIBRARIAN_BOOKS_TABLE)
    .update({ available_copies: current.available_copies - 1 })
    .eq('id', id);

  if (error) throw error;
};

const mapLibraryStudent = (row: any): LibraryStudent => ({
  id: row.id,
  name: row.name,
  email: row.email,
  rollNo: row.roll_no,
  categoryId: row.category_id,
  sectionId: row.section_id,
  sectionName: row.sections?.name,
});

export const fetchStudents = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('id, name, email, roll_no, category_id, section_id, sections(name)')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data || []).map(mapLibraryStudent);
};

export const fetchStudentByRollNo = async (rollNo: string) => {
  const client = assertSupabase();
  const normalizedRollNo = rollNo.trim();

  if (!normalizedRollNo) return null;

  const { data, error } = await client
    .from('students')
    .select('id, name, email, roll_no, category_id, section_id, sections(name)')
    .ilike('roll_no', normalizedRollNo)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLibraryStudent(data) : null;
};

export interface LibraryIssue {
  id: string;
  student_id: string;
  book_id: string;
  issue_date: string;
  due_date: string;
  returned_at?: string | null;
  returned_date?: string | null;
  status: string;
  reminderSent?: boolean;
  reminderSentAt?: string | null;
  overdueStatus?: string;
  reminderCount?: number;
  book?: LibraryBook;
  student?: { id: string; name: string; rollNo?: string; sectionName?: string };
}

export interface LibraryReminderHistory {
  id: string;
  issueId: string;
  studentId: string;
  bookId: string;
  message: string;
  createdAt: string;
  book?: Pick<LibraryBook, 'id' | 'title'>;
  student?: { id: string; name: string; rollNo?: string; sectionName?: string };
}

export const fetchLibraryIssues = async () => {
  const client = assertSupabase();
  try {
    await client.rpc('process_library_overdue_reminders');
  } catch {
    // Older Supabase schemas may not have the overdue processor yet.
  }
  let { data, error }: { data: any[] | null; error: any } = await client
    .from('library_issues')
    .select('id, student_id, book_id, issue_date, due_date, returned_at, returned_date, status, reminder_sent, reminder_sent_at, overdue_status, updated_at, library_reminders(id), book:librarian_books(id, title, author, category, isbn, total_copies, available_copies, status), student:students(id, name, roll_no, section_id, sections(name))')
    .order('updated_at', { ascending: false });

  if (error) {
    const fallback = await client
      .from('library_issues')
      .select('id, student_id, book_id, issue_date, due_date, returned_at, status, book:librarian_books(id, title, author, category, isbn, total_copies, available_copies, status), student:students(id, name, roll_no, section_id, sections(name))')
      .order('due_date', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    book_id: row.book_id,
    issue_date: row.issue_date,
    due_date: row.due_date,
    returned_at: row.returned_at,
    returned_date: row.returned_date,
    status: String(row.status || '').toLowerCase(),
    reminderSent: Boolean(row.reminder_sent),
    reminderSentAt: row.reminder_sent_at,
    overdueStatus: row.overdue_status || (!row.returned_at && row.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'current'),
    reminderCount: row.library_reminders?.length || 0,
    book: row.book ? mapLibraryBook(row.book) : undefined,
    student: row.student ? { id: row.student.id, name: row.student.name, rollNo: row.student.roll_no, sectionName: row.student.sections?.name } : undefined,
  })) as LibraryIssue[];
};

export const createIssueRecord = async (studentId: string, bookId: string, dueDate = defaultLibraryDueDate()) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('issue_library_book', {
    target_student_id: studentId,
    target_book_id: bookId,
    target_due_date: dueDate || null,
  });

  if (error) throw error;
  return data as any;
};

export const markIssueReturned = async (issueId: string) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('return_library_issue', {
    target_issue_id: issueId,
  });

  if (error) throw error;
  return data as any;
};

export const sendReturnReminders = async (issueIds: string[], message?: string) => {
  const client = assertSupabase();
  // simple RPC or insert to notifications table if available
  const { error } = await client.rpc('send_library_reminders', { issue_ids: issueIds, reminder_message: message || 'Please return the issued library book.' });
  if (error) throw error;
};

export const fetchLibraryReminderHistory = async () => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('library_reminders')
    .select('id, issue_id, student_id, book_id, reminder_message, created_at, book:librarian_books(id, title), student:students(id, name, roll_no, section_id, sections(name))')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    issueId: row.issue_id,
    studentId: row.student_id,
    bookId: row.book_id,
    message: row.reminder_message,
    createdAt: row.created_at,
    book: row.book ? { id: row.book.id, title: row.book.title } : undefined,
    student: row.student ? { id: row.student.id, name: row.student.name, rollNo: row.student.roll_no, sectionName: row.student.sections?.name } : undefined,
  })) as LibraryReminderHistory[];
};

export const fetchFeeRecords = async (studentEmail?: string) => {
  const client = assertSupabase();
  let query = client
    .from('student_fee_records')
    .select(`
      id,
      student_id,
      total_amount,
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
  if (error) {
    throw error;
  }

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
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      pendingAmount: row.remaining_amount,
      dueDate: row.due_date,
      type: row.fee_categories?.name,
      status: row.status,
      latestNote: notes[0]?.note,
    };
  }) as FeeRecord[];
};

export const updateFeeStatuses = async (
  recordIds: string[],
  status: 'Paid' | 'Pending' | 'Partial',
  partialPaidAmount?: number
) => {
  const client = assertSupabase();
  const payload = partialPaidAmount === undefined
    ? {
        record_ids: recordIds,
        new_status: status,
      }
    : {
        record_ids: recordIds,
        new_status: status,
        partial_paid_amount: partialPaidAmount,
      };

  const { error } = await client.rpc('bulk_update_fee_status', payload);

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

export const setStandardTermFee = async ({
  standard,
  term,
  amount,
  dueDate,
  message,
}: {
  standard: number;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  amount: number;
  dueDate: string;
  message?: string;
}) => {
  const client = assertSupabase();
  const { data, error } = await client.rpc('set_standard_term_fee', {
    target_standard: standard,
    target_term: term,
    target_total_amount: amount,
    target_due_date: dueDate,
    reminder_message: message || null,
  });

  if (error) throw error;
  return Number(data || 0);
};

export const updateFeeCategoryDueDate = async (categoryName: string, dueDate: string, recordIds?: string[]) => {
  const client = assertSupabase();
  const { error } = await client.rpc('set_fee_category_due_date', {
    category_name: categoryName,
    target_due_date: dueDate,
    record_ids: recordIds?.length ? recordIds : null,
  });

  if (error) throw error;
};
