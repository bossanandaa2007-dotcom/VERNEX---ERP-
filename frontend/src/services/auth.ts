import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getRoleLabel, normalizeRole, type MainRole } from '../utils/roles';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mainRole: MainRole | null;
  designation?: string;
  isActive: boolean;
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
  auth_user_id?: string | null;
  name?: string | null;
  email: string | null;
  role?: string | null;
  full_name?: string | null;
  main_role?: string | null;
  designation?: string | null;
  is_active?: boolean | null;
}

const GOVERNING_BODY_LABEL = 'Governing Body';

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

const toError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error ? error.message : undefined;
    const description = 'error_description' in error ? error.error_description : undefined;
    const code = 'error' in error ? error.error : undefined;

    for (const value of [message, description, code]) {
      if (typeof value === 'string' && value.trim()) {
        return new Error(value);
      }
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error);
  }

  return new Error(fallback);
};

const singleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const compactUnique = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));

const getMetadataValue = (metadata: Record<string, unknown> | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const getAuthDisplayName = (session: Session) =>
  getMetadataValue(session.user.user_metadata, ['full_name', 'name', 'display_name']);

const getGoverningDesignation = (session: Session) =>
  getMetadataValue(session.user.user_metadata, ['designation', 'role_title', 'sub_role', 'position']);

const getDesignationFromLegacyRole = (role?: string | null) => {
  if (!role || normalizeRole(role) !== 'governing_body') {
    return undefined;
  }

  const value = role.trim();
  return value && value !== GOVERNING_BODY_LABEL ? value : undefined;
};

const getStoredGoverningDesignation = (designation?: string | null) => {
  const value = designation?.trim();
  return value && value !== GOVERNING_BODY_LABEL ? value : undefined;
};

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

const mapProfileToUser = async (
  session: Session,
  profile: ProfileRow | null,
  legacyProfile?: ProfileRow | null
): Promise<AuthenticatedUser> => {
  const mainRole =
    normalizeRole(profile?.main_role)
    || normalizeRole(profile?.role)
    || normalizeRole(session.user.user_metadata?.role);
  const role = getRoleLabel(mainRole);
  let roleContext: UserRoleContext = {};
  const authDisplayName = getAuthDisplayName(session);
  const governingDesignation = mainRole === 'governing_body'
    ? getStoredGoverningDesignation(profile?.designation)
      || getStoredGoverningDesignation(legacyProfile?.designation)
      || getDesignationFromLegacyRole(profile?.role)
      || getDesignationFromLegacyRole(legacyProfile?.role)
      || getGoverningDesignation(session)
      || GOVERNING_BODY_LABEL
    : undefined;

  try {
    roleContext =
      mainRole === 'student'
        ? await fetchStudentProfile(session.user.id)
        : mainRole === 'teacher'
          ? await fetchTeacherProfile(session.user.id)
          : {};
  } catch (error) {
    console.error(`Failed to load ${role.toLowerCase()} role context:`, error);
  }

  return {
    id: session.user.id,
    name: profile?.full_name || profile?.name || legacyProfile?.name || authDisplayName || session.user.email || (mainRole === 'governing_body' ? 'Governing User' : 'User'),
    email: profile?.email || session.user.email || '',
    role,
    mainRole,
    designation: governingDesignation,
    isActive: profile?.is_active ?? true,
    standard: roleContext.standard,
    class: roleContext.className,
    section: roleContext.section,
    standards: roleContext.standards,
    classes: roleContext.classes,
    subject: roleContext.subject,
    subjects: roleContext.subjects,
  };
};

const USER_PROFILE_COLUMNS = 'id, auth_user_id, email, full_name, main_role, designation, is_active';
const LEGACY_PROFILE_COLUMNS = 'id, name, email, role, designation';

const fetchUserProfileByAuthId = async (session: Session) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('user_profiles')
    .select(USER_PROFILE_COLUMNS)
    .eq('auth_user_id', session.user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error('Failed to load user profile by auth UID:', error);
    return null;
  }

  return data || null;
};

const fetchUserProfileByEmail = async (session: Session) => {
  if (!session.user.email) {
    return null;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('user_profiles')
    .select(USER_PROFILE_COLUMNS)
    .eq('email', session.user.email.toLowerCase())
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error('Failed to load user profile by email:', error);
    return null;
  }

  return data || null;
};

const fetchLegacyProfileById = async (session: Session) => {
  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(LEGACY_PROFILE_COLUMNS)
    .eq('id', session.user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error('Failed to load legacy profile by auth UID:', error);
    return null;
  }

  return data || null;
};

const fetchLegacyProfileByEmail = async (session: Session) => {
  if (!session.user.email) {
    return null;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .select(LEGACY_PROFILE_COLUMNS)
    .eq('email', session.user.email.toLowerCase())
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error('Failed to load legacy profile by email:', error);
    return null;
  }

  return data || null;
};

const getSessionProfile = async (session: Session): Promise<AuthenticatedUser> => {
  const userProfile = await fetchUserProfileByAuthId(session) || await fetchUserProfileByEmail(session);
  const legacyProfile = await fetchLegacyProfileById(session) || await fetchLegacyProfileByEmail(session);
  const profile = userProfile || legacyProfile;

  return mapProfileToUser(session, profile || null, legacyProfile || null);
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
    throw toError(error, 'Unable to sign in. Please verify the Supabase deployment configuration.');
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
