import { Users, IndianRupee, TrendingUp, Bell, FileText, Building2, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/useClassStore';
import { useComplaintStore } from '../../store/useComplaintStore';
import { fetchComplaints } from '../../services/complaints';
import { fetchAttendanceOverview } from '../../services/attendance';

const AdminDashboard = () => {
  const initialize = useClassStore((state) => state.initialize);
  const categories = useClassStore((state) => state.categories);
  const teachers = useClassStore((state) => state.teachers);
  const students = useClassStore((state) => state.students);
  const complaints = useComplaintStore((state) => state.complaints);
  const setComplaints = useComplaintStore((state) => state.setComplaints);
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState<Array<{ name: string; present: number; absent: number }>>([]);
  const [standardAttendanceData, setStandardAttendanceData] = useState<Array<{ name: string; avg: number }>>([]);

  useEffect(() => {
    void initialize();
    void fetchComplaints().then(setComplaints).catch(console.error);
    void fetchAttendanceOverview(7)
      .then((overview) => {
        setAttendanceData(
          overview.trend.map((point) => ({
            name: point.label,
            present: point.present,
            absent: point.absent,
          }))
        );
        setStandardAttendanceData(
          categories.map((category) => {
            const matchingSections = new Set(
              useClassStore
                .getState()
                .sections
                .filter((section) => section.categoryId === category.id)
                .map((section) => section.name)
            );
            const matchingPoints = overview.classBreakdown.filter((point) => matchingSections.has(point.classId));
            const totalRecords = matchingPoints.reduce((sum, point) => sum + point.total, 0);
            const totalPresent = matchingPoints.reduce((sum, point) => sum + point.presentCount, 0);
            const avg = totalRecords
              ? Math.round((totalPresent / totalRecords) * 100)
              : 0;

            return {
              name: category.name,
              avg,
            };
          })
        );
      })
      .catch(console.error);
  }, [categories, initialize, setComplaints]);

  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  const quickActions = [
    { name: 'Manage Classes', icon: Building2, path: '/admin/classes' },
    { name: 'Faculty Hub', icon: Shield, path: '/admin/teachers' },
    { name: 'Fees & Finance', icon: IndianRupee, path: '/admin/fees' },
    { name: 'Reports & Analytics', icon: FileText, path: '/admin/reports' },
  ];

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Overview</h1>
        <p className="text-slate-500 mt-1">Operational summary for admissions, staffing, attendance, finance, and reports.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Academic Levels', value: categories.length.toString(), icon: Building2, color: 'bg-blue-700', trend: 'Classes and sections', path: '/admin/classes' },
          { title: 'Faculty Records', value: totalTeachers.toString(), icon: Shield, color: 'bg-emerald-700', trend: 'Teacher directory', path: '/admin/teachers' },
          { title: 'Student Enrollment', value: totalStudents.toString(), icon: Users, color: 'bg-slate-700', trend: 'Active student records', path: '/admin/students' },
          { title: 'Finance Workflow', value: 'Active', icon: IndianRupee, color: 'bg-teal-700', trend: 'Fee records enabled', path: '/admin/fees' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => navigate(stat.path)}
            className="cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-slate-50"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className={`rounded p-2.5 ${stat.color} text-white`}>
                <stat.icon size={22} />
              </div>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">Live</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-500">
              <TrendingUp size={14} />
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Weekly Attendance Summary</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                <Area type="monotone" dataKey="present" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Attendance By Level</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={standardAttendanceData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none' }} />
                <Bar dataKey="avg" fill="#0f766e" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notifications and Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Complaints</h2>
            <button className="text-sm font-medium text-[#3f5f9f] hover:text-[#2f4f86]">View All</button>
          </div>
          <div className="divide-y divide-slate-100">
            {complaints.slice(0, 3).map((notif) => (
              <div key={notif.id} className="flex cursor-pointer items-start gap-3 py-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${notif.priority === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900">{notif.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{notif.description}</p>
                  <span className="text-[10px] font-medium text-slate-400 mt-2 block">{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <action.icon size={20} className="text-slate-500" />
                <span className="text-sm font-medium">{action.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
