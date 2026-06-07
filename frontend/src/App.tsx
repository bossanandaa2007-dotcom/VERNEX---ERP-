import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useClassStore } from './store/useClassStore';
import ErrorBoundary from './components/common/ErrorBoundary';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { normalizeRole } from './utils/roles';

const LoginModule = lazy(() => import('./modules/auth/Login'));
const AdminDashboard = lazy(() => import('./modules/dashboard/Admin'));
const TeacherDashboard = lazy(() => import('./modules/dashboard/Teacher'));
const StudentDashboard = lazy(() => import('./modules/dashboard/Student'));
const GoverningDashboard = lazy(() => import('./modules/dashboard/Governing'));
const AttendanceDashboard = lazy(() => import('./modules/attendance/AttendanceDashboard'));
const LibraryDashboard = lazy(() => import('./modules/library/LibraryDashboard'));
const LibrarianDashboard = lazy(() => import('./modules/library/librarian/LibrarianDashboard'));
const LibrarianBooks = lazy(() => import('./modules/library/librarian/BooksPage'));
const LibrarianStudents = lazy(() => import('./modules/library/librarian/StudentsPage'));
const LibrarianIssued = lazy(() => import('./modules/library/librarian/IssuedBooksPage'));
const LibrarianReminders = lazy(() => import('./modules/library/librarian/RemindersPage'));
const FinanceDashboard = lazy(() => import('./modules/finance/FinanceDashboard'));
const FinanceReportsPage = lazy(() => import('./modules/finance/FinanceReportsPage'));
const EventDashboard = lazy(() => import('./modules/events/EventDashboard'));
const StudentList = lazy(() => import('./modules/students/StudentList'));
const StudentAcademics = lazy(() => import('./modules/students/StudentAcademics'));
const StudentProfile = lazy(() => import('./modules/students/StudentProfile'));
const TeacherList = lazy(() => import('./modules/teachers/TeacherList'));
const TeacherClasses = lazy(() => import('./modules/teachers/TeacherClasses'));
const TeacherAcademics = lazy(() => import('./modules/teachers/TeacherAcademics'));
const TeacherProfile = lazy(() => import('./modules/teachers/TeacherProfile'));
const ClassesDashboard = lazy(() => import('./modules/classes/ClassesDashboard'));
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'));
const StudyMaterials = lazy(() => import('./modules/academic/StudyMaterials'));
const Assignments = lazy(() => import('./modules/academic/Assignments'));
const Calendar = lazy(() => import('./components/calendar/Calendar'));
const MarksEntry = lazy(() => import('./components/marks/MarksEntry'));
const StudentMarks = lazy(() => import('./components/marks/StudentMarks'));
const AdminMarksDashboard = lazy(() => import('./components/marks/AdminMarksDashboard'));
const AIAttendance = lazy(() => import('./components/attendance/AIAttendance'));
const ComplaintForm = lazy(() => import('./components/complaints/ComplaintForm'));
const ComplaintInbox = lazy(() => import('./components/complaints/ComplaintInbox'));
const LeaveRequestForm = lazy(() => import('./components/leave/LeaveRequestForm'));
const LeaveRequestInbox = lazy(() => import('./components/leave/LeaveRequestInbox'));
const TimetablePage = lazy(() => import('./modules/timetable/TimetablePage'));

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();
  const normalizedAllowedRoles = allowedRoles
    ?.map(normalizeRole)
    .filter((role): role is NonNullable<ReturnType<typeof normalizeRole>> => Boolean(role));

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    const loginPath = normalizedAllowedRoles?.includes('student') || location.pathname.startsWith('/student')
      ? '/student-login'
      : '/login';
    return <Navigate to={loginPath} replace />;
  }

  if (!user.isActive || !user.mainRole || (normalizedAllowedRoles && !normalizedAllowedRoles.includes(user.mainRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const refreshSchoolData = useClassStore((state) => state.refresh);
  const resetSchoolData = useClassStore((state) => state.reset);
  const userId = user?.id;
  const userRole = user?.mainRole;

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!userId) {
      resetSchoolData();
      return;
    }

    if (userRole === 'student') {
      resetSchoolData();
      return;
    }

    void refreshSchoolData();
  }, [isLoading, refreshSchoolData, resetSchoolData, userId, userRole]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">Loading...</div>}>
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginModule />} />
          <Route path="/student-login" element={<LoginModule mode="student" />} />
        </Route>

        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['Student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/accountant/dashboard" element={<Navigate to="/accountant/fees" replace />} />
          <Route path="/governing/dashboard" element={<ProtectedRoute allowedRoles={['Governing Body']}><GoverningDashboard /></ProtectedRoute>} />
          {/* --- Admin Routes --- */}
          <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={['Admin']}><ClassesDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['Admin']}><StudentList /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['Admin']}><TeacherList /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/library" element={<ProtectedRoute allowedRoles={['Admin']}><LibraryDashboard /></ProtectedRoute>} />
          {/* Librarian Role Pages */}
          <Route path="/librarian/dashboard" element={<ProtectedRoute allowedRoles={['Librarian']}><LibrarianDashboard /></ProtectedRoute>} />
          <Route path="/librarian/books" element={<ProtectedRoute allowedRoles={['Librarian']}><LibrarianBooks /></ProtectedRoute>} />
          <Route path="/librarian/students" element={<ProtectedRoute allowedRoles={['Librarian']}><LibrarianStudents /></ProtectedRoute>} />
          <Route path="/librarian/issued" element={<ProtectedRoute allowedRoles={['Librarian']}><LibrarianIssued /></ProtectedRoute>} />
          <Route path="/librarian/reminders" element={<ProtectedRoute allowedRoles={['Librarian']}><LibrarianReminders /></ProtectedRoute>} />
          <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['Admin']}><FinanceDashboard /></ProtectedRoute>} />
          <Route path="/admin/events" element={<ProtectedRoute allowedRoles={['Admin']}><EventDashboard /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['Admin']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['Admin']}><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['Admin']}><div className="p-8"><Calendar isAdmin={true} /></div></ProtectedRoute>} />
          <Route path="/admin/marks" element={<ProtectedRoute allowedRoles={['Admin']}><div className="p-8"><AdminMarksDashboard /></div></ProtectedRoute>} />
          <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['Admin']}><div className="p-8"><TimetablePage /></div></ProtectedRoute>} />

          {/* --- Teacher Routes --- */}
          <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherClasses /></ProtectedRoute>} />
          <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={['Teacher']}><AttendanceDashboard /></ProtectedRoute>} />
          <Route path="/teacher/academics" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherAcademics /></ProtectedRoute>} />
          <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['Teacher']}><TeacherProfile /></ProtectedRoute>} />
          <Route path="/teacher/ai-attendance" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><AIAttendance /></div></ProtectedRoute>} />
          <Route path="/teacher/marks-entry" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><MarksEntry /></div></ProtectedRoute>} />
          <Route path="/teacher/leave-requests" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><LeaveRequestInbox /></div></ProtectedRoute>} />
          <Route path="/teacher/complaints" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><ComplaintInbox /></div></ProtectedRoute>} />
          <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['Teacher']}><Assignments /></ProtectedRoute>} />
          <Route path="/teacher/materials" element={<ProtectedRoute allowedRoles={['Teacher']}><StudyMaterials /></ProtectedRoute>} />
          <Route path="/teacher/events" element={<ProtectedRoute allowedRoles={['Teacher']}><EventDashboard /></ProtectedRoute>} />
          <Route path="/teacher/calendar" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><Calendar /></div></ProtectedRoute>} />
          <Route path="/teacher/timetable" element={<ProtectedRoute allowedRoles={['Teacher']}><div className="p-3 lg:p-8"><TimetablePage /></div></ProtectedRoute>} />

          {/* --- Student Routes --- */}
          <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['Student']}><AttendanceDashboard /></ProtectedRoute>} />
          <Route path="/student/academics" element={<ProtectedRoute allowedRoles={['Student']}><StudentAcademics /></ProtectedRoute>} />
          <Route path="/student/performance" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><StudentMarks /></div></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['Student']}><StudentProfile /></ProtectedRoute>} />
          <Route path="/student/marks" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><StudentMarks /></div></ProtectedRoute>} />
          <Route path="/student/materials" element={<ProtectedRoute allowedRoles={['Student']}><StudyMaterials /></ProtectedRoute>} />
          <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['Student']}><Assignments /></ProtectedRoute>} />
          <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['Student']}><FinanceDashboard /></ProtectedRoute>} />
          <Route path="/student/events" element={<ProtectedRoute allowedRoles={['Student']}><EventDashboard /></ProtectedRoute>} />
          <Route path="/student/calendar" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><Calendar /></div></ProtectedRoute>} />
          <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><TimetablePage /></div></ProtectedRoute>} />
          <Route path="/student/leave-requests" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><LeaveRequestForm /></div></ProtectedRoute>} />
          <Route path="/student/complaints" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><ComplaintForm /></div></ProtectedRoute>} />

          {/* --- Accountant Routes --- */}
          <Route path="/accountant/fees" element={<ProtectedRoute allowedRoles={['Accountant']}><FinanceDashboard /></ProtectedRoute>} />
          <Route path="/accountant/reports" element={<ProtectedRoute allowedRoles={['Accountant']}><FinanceReportsPage /></ProtectedRoute>} />

          {/* --- Governing Body Routes --- */}
          <Route path="/governing/complaints" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-3 lg:p-8"><ComplaintInbox /></div></ProtectedRoute>} />
          <Route path="/governing/calendar" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-3 lg:p-8"><Calendar /></div></ProtectedRoute>} />
          <Route path="/governing/reports" element={<ProtectedRoute allowedRoles={['Governing Body']}><ReportsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<div className="flex items-center justify-center min-h-screen">404 - Not Found</div>} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Unauthorized</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">You do not have access to this page.</h1>
        <p className="mt-3 text-sm text-slate-600">Please sign in with an account that has the correct role, or go back to the login screen.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Go to login</Link>
        </div>
      </div>
    </div>
  );
}
