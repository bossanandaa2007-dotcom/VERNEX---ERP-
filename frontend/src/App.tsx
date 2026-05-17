import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useClassStore } from './store/useClassStore';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import LoginModule from './modules/auth/Login';
import AdminDashboard from './modules/dashboard/Admin';
import TeacherDashboard from './modules/dashboard/Teacher';
import StudentDashboard from './modules/dashboard/Student';
import GoverningDashboard from './modules/dashboard/Governing';
import AttendanceDashboard from './modules/attendance/AttendanceDashboard';
import LibraryDashboard from './modules/library/LibraryDashboard';
import FinanceDashboard from './modules/finance/FinanceDashboard';
import EventDashboard from './modules/events/EventDashboard';
import StudentList from './modules/students/StudentList';
import StudentAcademics from './modules/students/StudentAcademics';
import StudentProfile from './modules/students/StudentProfile';
import TeacherList from './modules/teachers/TeacherList';
import TeacherClasses from './modules/teachers/TeacherClasses';
import TeacherAcademics from './modules/teachers/TeacherAcademics';
import TeacherProfile from './modules/teachers/TeacherProfile';
import ClassesDashboard from './modules/classes/ClassesDashboard';
import ReportsPage from './modules/reports/ReportsPage';
import SettingsPage from './modules/settings/SettingsPage';
import StudyMaterials from './modules/academic/StudyMaterials';
import Assignments from './modules/academic/Assignments';
import Calendar from './components/calendar/Calendar';
import LeaveRequestForm from './components/leave/LeaveRequestForm';
import LeaveRequestList from './components/leave/LeaveRequestList';
import MarksEntry from './components/marks/MarksEntry';
import StudentMarks from './components/marks/StudentMarks';
import AdminMarksDashboard from './components/marks/AdminMarksDashboard';
import AIAttendance from './components/attendance/AIAttendance';
import ComplaintForm from './components/complaints/ComplaintForm';
import ComplaintInbox from './components/complaints/ComplaintInbox';
import TimetablePage from './modules/timetable/TimetablePage';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const initializeSchoolData = useClassStore((state) => state.initialize);
  const refreshSchoolData = useClassStore((state) => state.refresh);
  const resetSchoolData = useClassStore((state) => state.reset);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      resetSchoolData();
      return;
    }

    if (user.role === 'Student') {
      resetSchoolData();
      return;
    }

    void refreshSchoolData();
  }, [initializeSchoolData, isLoading, refreshSchoolData, resetSchoolData, user?.id, user?.role]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginModule />} />
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
          <Route path="/teacher/leave-requests" element={<ProtectedRoute allowedRoles={['Teacher', 'Governing Body']}><div className="p-3 lg:p-8"><LeaveRequestList /></div></ProtectedRoute>} />
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
          <Route path="/student/leave" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><LeaveRequestForm /></div></ProtectedRoute>} />
          <Route path="/student/complaints" element={<ProtectedRoute allowedRoles={['Student']}><div className="p-3 lg:p-8"><ComplaintForm /></div></ProtectedRoute>} />

          {/* --- Accountant Routes --- */}
          <Route path="/accountant/fees" element={<ProtectedRoute allowedRoles={['Accountant']}><FinanceDashboard /></ProtectedRoute>} />

          {/* --- Governing Body Routes --- */}
          <Route path="/governing/dashboard" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-8"><GoverningDashboard /></div></ProtectedRoute>} />
          <Route path="/governing/leave-requests" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-8"><LeaveRequestList /></div></ProtectedRoute>} />
          <Route path="/governing/complaints" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-8"><ComplaintInbox /></div></ProtectedRoute>} />
          <Route path="/governing/calendar" element={<ProtectedRoute allowedRoles={['Governing Body']}><div className="p-8"><Calendar /></div></ProtectedRoute>} />
          <Route path="/governing/reports" element={<ProtectedRoute allowedRoles={['Governing Body']}><ReportsPage /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<div className="flex items-center justify-center min-h-screen">404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
