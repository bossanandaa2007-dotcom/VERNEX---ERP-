export type MainRole = 'admin' | 'teacher' | 'student' | 'accountant' | 'librarian' | 'governing_body';

const ROLE_ALIASES: Record<string, MainRole> = {
  admin: 'admin',
  teacher: 'teacher',
  student: 'student',
  accountant: 'accountant',
  librarian: 'librarian',
  governing_body: 'governing_body',
  governing: 'governing_body',
  principal: 'governing_body',
  headmaster: 'governing_body',
  hm: 'governing_body',
  correspondent: 'governing_body',
  vice_principal: 'governing_body',
  pt_sir: 'governing_body',
  administrator: 'governing_body',
  management: 'governing_body',
  management_member: 'governing_body',
};

const ROLE_LABELS: Record<MainRole, string> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  accountant: 'Accountant',
  librarian: 'Librarian',
  governing_body: 'Governing Body',
};

export const normalizeRole = (role?: string | null): MainRole | null => {
  if (!role) {
    return null;
  }

  const key = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[key] || null;
};

export const getRoleLabel = (role?: MainRole | null) => role ? ROLE_LABELS[role] : 'Unknown';

export const isStaffRole = (role?: MainRole | null) =>
  role === 'admin' || role === 'teacher' || role === 'accountant' || role === 'librarian' || role === 'governing_body';

export const getDashboardPath = (role?: MainRole | null) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/dashboard';
    case 'accountant':
      return '/accountant/fees';
    case 'librarian':
      return '/librarian/dashboard';
    case 'governing_body':
      return '/governing/dashboard';
    default:
      return '/unauthorized';
  }
};

