import { Calendar, Award, CreditCard, Clock, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockStudents, mockFees, mockEvents } from '../../mock-data';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const performanceData = [
  { name: 'Unit 1', score: 75 },
  { name: 'Unit 2', score: 82 },
  { name: 'Mid Term', score: 88 },
  { name: 'Unit 3', score: 85 },
];

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const studentData = mockStudents.find(s => s.email === user?.email);
  const feeData = mockFees.find(f => f.studentEmail === user?.email);
  const upcomingEvents = mockEvents.filter(e => e.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-slate-500 mt-1">Class {studentData?.class || user?.class} | Section {studentData?.section || user?.section}</p>
        </div>
        <div className="flex gap-3">
          <div 
            onClick={() => navigate('/student/attendance')}
            className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-center cursor-pointer hover:bg-indigo-100 transition-colors"
          >
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Attendance</p>
            <p className="text-xl font-bold text-indigo-700">{studentData?.attendance || 0}%</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Grade</p>
            <p className="text-xl font-bold text-emerald-700">A</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Upcoming Events', value: upcomingEvents.toString(), icon: Calendar, color: 'bg-orange-500', path: '/student/events' },
          { title: 'Pending Fees', value: feeData ? formatCurrency(feeData.pendingAmount.toLocaleString()) : formatCurrency(0), icon: CreditCard, color: 'bg-rose-500', path: '/student/fees' },
          { title: 'Assignments Due', value: '2', icon: Clock, color: 'bg-blue-500', path: '/student/materials' },
          { title: 'Recent Awards', value: '1', icon: Award, color: 'bg-amber-500', path: '#' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.path)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center gap-4 cursor-pointer"
          >
             <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                <stat.icon size={24} />
              </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">My Performance Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Materials */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Study Materials</h2>
            <button 
              onClick={() => navigate('/student/materials')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Browse All
            </button>
          </div>
          <div className="space-y-3">
             {[
               { title: 'Chapter 5: Quadratic Equations', subject: 'Mathematics', date: 'Yesterday' },
               { title: 'Force and Laws of Motion Notes', subject: 'Physics', date: '3 days ago' },
               { title: 'Life Processes Worksheets', subject: 'Biology', date: 'Last week' },
             ].map((doc, i) => (
               <div 
                 key={i} 
                 onClick={() => navigate('/student/materials')}
                 className="flex gap-4 items-center p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
               >
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                   <FileText size={20} />
                 </div>
                 <div className="flex-1">
                   <h4 className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">{doc.title}</h4>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{doc.subject}</span>
                     <span className="text-xs text-slate-400">{doc.date}</span>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default StudentDashboard;
