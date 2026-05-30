import { Users, IndianRupee, TrendingUp, Bell, FileText, Building2, Shield } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/useClassStore';
import { useComplaintStore } from '../../store/useComplaintStore';
import { fetchComplaints } from '../../services/complaints';
import { fetchAttendanceOverview } from '../../services/attendance';

const AdminDashboard = () => {
  const { user } = useAuthStore();
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
            const avg = matchingPoints.length
              ? Math.round(matchingPoints.reduce((sum, point) => sum + point.pct, 0) / matchingPoints.length)
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
    { name: 'Generate Report', icon: FileText, path: '/admin/reports' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Academic Classes', value: `${categories.length} Levels`, icon: Building2, color: 'bg-indigo-600', trend: 'Live from Supabase', path: '/admin/classes' },
          { title: 'Total Teachers', value: totalTeachers.toString(), icon: Shield, color: 'bg-emerald-600', trend: 'Faculty records in DB', path: '/admin/teachers' },
          { title: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'bg-blue-600', trend: 'Enrollment records in DB', path: '/admin/students' },
          { title: 'Finance Overview', value: 'Active', icon: IndianRupee, color: 'bg-rose-600', trend: 'Fees tracking enabled', path: '/admin/fees' },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => navigate(stat.path)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">This Month</span>
            </div>
            <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-medium text-emerald-600">
              <TrendingUp size={14} />
              <span>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Attendance Trends (This Week)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Attendance By Level</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={standardAttendanceData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="avg" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notifications and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Notifications</h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          <div className="space-y-4">
            {complaints.slice(0, 3).map((notif) => (
              <div key={notif.id} className="flex gap-4 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.priority === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-all group"
              >
                <action.icon size={24} className="mb-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
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
