import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  standard?: string;
  class?: string;
  section?: string;
  standards?: string[];
  classes?: string[];
  subject?: string;
  subjects?: string[];
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

interface StudentProfileRow {
  section_id: string;
  sections:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
}

interface TeacherProfileRow {
  subject: string | null;
  subjects: string[] | null;
  home_section_subject: string | null;
  home_section:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
}

interface SectionTeacherAssignmentRow {
  role: 'Class Teacher' | 'Subject Teacher';
  subject: string | null;
  sections:
    | {
        name: string | null;
      }
    | Array<{
        name: string | null;
      }>
    | null;
}

interface UserRoleContext {
  standard?: string;
  className?: string;
  section?: string;
  standards?: string[];
  classes?: string[];
  subject?: string;
  subjects?: string[];
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

const compactUnique = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));

const splitClassName = (className?: string) => {
  if (!className) {
    return {};
  }

  const [standard, section] = className.split('-');
  return {
    standard: standard || undefined,
    section: section || undefined,
  };
};

const fetchStudentProfile = async (profileId: string): Promise<UserRoleContext> => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('students')
    .select('section_id, sections!inner(name)')
    .eq('profile_id', profileId)
    .maybeSingle<StudentProfileRow>();

  if (error) {
    throw error;
  }

  const section = singleRelation(data?.sections);
  const className = section?.name || undefined;

  return {
    className,
    classes: className ? [className] : undefined,
    ...splitClassName(className),
  };
};

const fetchTeacherProfile = async (profileId: string): Promise<UserRoleContext> => {
  const client = assertSupabase();
  const [teacherRes, assignmentsRes] = await Promise.all([
    client
      .from('teachers')
      .select('subject, subjects, home_section_subject, home_section:sections!teachers_home_section_id_fkey(name)')
      .eq('profile_id', profileId)
      .maybeSingle<TeacherProfileRow>(),
    client
      .from('section_teacher_assignments')
      .select('role, subject, sections!inner(name)')
      .eq('teacher_profile_id', profileId),
  ]);

  if (teacherRes.error) {
    throw teacherRes.error;
  }

  if (assignmentsRes.error) {
    throw assignmentsRes.error;
  }

  const teacher = teacherRes.data;
  const assignmentRows = (assignmentsRes.data || []) as SectionTeacherAssignmentRow[];
  const assignmentClasses = assignmentRows.map((row) => singleRelation(row.sections)?.name);
  const homeClass = singleRelation(teacher?.home_section)?.name || undefined;
  const classes = compactUnique([homeClass, ...assignmentClasses]);
  const primaryClass = homeClass || assignmentClasses[0];
  const assignedSubjects = assignmentRows
    .filter((row) => row.role === 'Subject Teacher')
    .map((row) => row.subject);
  const subjects = compactUnique([teacher?.home_section_subject, teacher?.subject, ...(teacher?.subjects || []), ...assignedSubjects]);

  return {
    className: primaryClass || undefined,
    classes: classes.length ? classes : undefined,
    standards: classes.length ? classes : undefined,
    subject: teacher?.home_section_subject || teacher?.subject || subjects[0],
    subjects: subjects.length ? subjects : undefined,
    ...splitClassName(primaryClass || undefined),
  };
};

const mapProfileToUser = async (session: Session, profile: ProfileRow | null): Promise<AuthenticatedUser> => {
  const role = profile?.role || session.user.user_metadata?.role || 'Student';
  let roleContext: UserRoleContext = {};

  try {
    roleContext =
      role === 'Student'
        ? await fetchStudentProfile(session.user.id)
        : role === 'Teacher'
          ? await fetchTeacherProfile(session.user.id)
          : {};
  } catch (error) {
    console.error(`Failed to load ${role.toLowerCase()} role context:`, error);
  }

  return {
    id: session.user.id,
    name: profile?.name || session.user.user_metadata?.name || session.user.email || 'User',
    email: profile?.email || session.user.email || '',
    role,
    standard: roleContext.standard,
    class: roleContext.className,
    section: roleContext.section,
    standards: roleContext.standards,
    classes: roleContext.classes,
    subject: roleContext.subject,
    subjects: roleContext.subjects,
  };
};

const getSessionProfile = async (session: Session): Promise<AuthenticatedUser> => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', session.user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileToUser(session, data);
};

export const initializeSupabaseAuth = async (): Promise<AuthenticatedUser | null> => {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  return getSessionProfile(session);
};

export const loginWithSupabase = async (email: string, password: string): Promise<AuthenticatedUser> => {
  const client = assertSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('No active Supabase session was returned.');
  }

  return getSessionProfile(data.session);
};

export const changeCurrentUserPassword = async (email: string, currentPassword: string, newPassword: string) => {
  const client = assertSupabase();
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    throw new Error('Email address is missing for this account.');
  }

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.');
  }

  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.');
  }

  const { error: verifyError } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password: currentPassword,
  });

  if (verifyError) {
    throw new Error('Current password is incorrect.');
  }

  const { error: updateError } = await client.auth.updateUser({ password: newPassword });

  if (updateError) {
    throw updateError;
  }
};

export const logoutFromSupabase = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};
