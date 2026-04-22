import { Users, BookOpen, UserCheck, Calendar, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { mockStudents } from '../../mock-data';
import { useNavigate } from 'react-router-dom';

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const assignedClasses = user?.classes || [];
  const totalStudents: number = mockStudents.filter(s => assignedClasses.includes(s.class)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}. Manage your classroom and digital resources.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { title: 'My Classes', value: assignedClasses.length.toString(), icon: BookOpen, color: 'bg-indigo-500', path: '/teacher/classes' },
          { title: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'bg-blue-500', path: '/teacher/classes' },
          { title: 'Study Materials', value: '12 Items', icon: FileText, color: 'bg-amber-500', path: '/teacher/materials' },
          { title: 'Progress Marked', value: `${assignedClasses.length - 1}/${assignedClasses.length}`, icon: UserCheck, color: 'bg-emerald-500', path: '/teacher/attendance' },
          { title: 'Upcoming Events', value: '2', icon: Calendar, color: 'bg-violet-500', path: '/teacher/events' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.path)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex items-center gap-4 cursor-pointer"
          >
             <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                <stat.icon size={22} />
              </div>
            <div>
              <h3 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{stat.title}</h3>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
            <span className="text-sm font-medium text-slate-500">April 2, 2026</span>
          </div>
          <div className="space-y-4">
             {assignedClasses.length > 0 ? (
               assignedClasses.map((cls, i) => (
                 <div key={i} className="flex gap-4 items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                   <div className="w-20 shrink-0 text-center">
                     <span className="text-sm font-bold text-indigo-600 block">{i === 0 ? '09:00 AM' : i === 1 ? '11:30 AM' : '02:00 PM'}</span>
                   </div>
                   <div className="w-1 h-12 bg-indigo-100 rounded-full"></div>
                   <div className="flex-1 flex justify-between items-center pr-2">
                     <div>
                       <h4 className="text-base font-semibold text-slate-900">{cls}</h4>
                       <p className="text-sm text-slate-500">{user?.subject || 'General'}</p>
                     </div>
                     <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                       Lecture
                     </span>
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-slate-500">No classes assigned today.</div>
             )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Pending Actions</h2>
          </div>
          <div className="space-y-3">
            {assignedClasses[0] && (
              <button 
                onClick={() => navigate('/teacher/attendance')}
                className="w-full flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl text-left hover:bg-rose-100 transition-colors shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg text-rose-500">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-rose-900">Mark Attendance: {assignedClasses[0]}</h4>
                    <p className="text-xs text-rose-600 mt-0.5">Due in 30 mins</p>
                  </div>
                </div>
                <span className="text-rose-600 font-medium text-sm">Action Required →</span>
              </button>
            )}
            {assignedClasses[1] && (
              <button 
                onClick={() => navigate('/teacher/assignments')}
                className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-left hover:bg-indigo-100 transition-colors shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg text-indigo-500">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-indigo-900">Upload Marks: Mid-Term Exam</h4>
                    <p className="text-xs text-indigo-600 mt-0.5">{assignedClasses[1]} {user?.subject}</p>
                  </div>
                </div>
                <span className="text-indigo-600 font-medium text-sm">Start →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TeacherDashboard;
