import { Calendar, Award, CreditCard, Clock, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { useEffect, useState } from 'react';
import { fetchStudentAttendanceSummary } from '../../services/attendance';
import { fetchStudentByProfile } from '../../services/schoolData';
import { useClassStore } from '../../store/useClassStore';

const performanceData = [
  { name: 'Unit 1', score: 75 },
  { name: 'Unit 2', score: 82 },
  { name: 'Mid Term', score: 88 },
  { name: 'Unit 3', score: 85 },
];

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<any>(null);
  const [attendance, setAttendance] = useState(0);
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void (async () => {
      const student = await fetchStudentByProfile(user.id);
      setStudentData(student);
      if (student) {
        const summary = await fetchStudentAttendanceSummary(student.id);
        setAttendance(summary.attendanceRate);
      }
    })();
  }, [user?.id]);

  const activeSection = sections.find((section) => section.id === studentData?.sectionId || section.name === user?.class);
  const activeSubjects = activeSection?.subjectTeachers || [];

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="rounded-[2rem] bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-200 lg:hidden">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-200">Student Home</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Hi, {user?.name?.split(' ')[0] || 'Student'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Class {studentData?.class || user?.class} - Section {studentData?.section || user?.section}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/student/performance')} className="rounded-2xl bg-white px-4 py-3 text-left text-slate-950 active:scale-[0.98]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</p>
            <p className="mt-1 text-lg font-black">{attendance}%</p>
          </button>
          <button onClick={() => navigate('/student/academics')} className="rounded-2xl bg-indigo-500 px-4 py-3 text-left text-white active:scale-[0.98]">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Open</p>
            <p className="mt-1 text-sm font-black">Academics</p>
          </button>
        </div>
      </div>

      <div className="hidden flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:flex">
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
            <p className="text-xl font-bold text-indigo-700">{attendance}%</p>
          </div>
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Grade</p>
            <p className="text-xl font-bold text-emerald-700">A</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {[
          { title: 'Attendance Rate', value: `${attendance}%`, icon: Calendar, color: 'bg-orange-500', path: '/student/attendance' },
          { title: 'Pending Fees', value: formatCurrency(0), icon: CreditCard, color: 'bg-rose-500', path: '/student/fees' },
          { title: 'Assignments Due', value: '0', icon: Clock, color: 'bg-blue-500', path: '/student/materials' },
          { title: 'Recent Awards', value: '0', icon: Award, color: 'bg-amber-500', path: '#' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.path)}
            className="flex cursor-pointer flex-col gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98] lg:flex-row lg:items-center lg:gap-4 lg:rounded-2xl lg:p-6 lg:hover:shadow-md"
          >
             <div className={`w-fit p-3 lg:p-4 rounded-xl ${stat.color} text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                <stat.icon size={20} />
              </div>
            <div className="min-w-0">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 lg:text-sm lg:font-medium lg:normal-case lg:tracking-normal">{stat.title}</h3>
              <p className="mt-1 text-lg font-black text-slate-900 lg:text-xl lg:font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Class Teachers</h2>
              <p className="text-sm text-slate-500 mt-1">
                See which subject is handled by which teacher in your class.
              </p>
            </div>
          </div>
          {activeSection ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Class Teacher</p>
                <p className="mt-1 text-base font-bold text-slate-900">{activeSection.classTeacher}</p>
              </div>
              <div className="space-y-3">
                {activeSubjects.length ? activeSubjects.map((teacher) => (
                  <div key={`${teacher.subject}:${teacher.id}`} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3 lg:rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{teacher.subject}</p>
                      <p className="break-words text-xs text-slate-500">Handled by {teacher.name}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 min-[380px]:inline-flex">
                      {teacher.name === activeSection.classTeacher ? 'Class Teacher' : 'Subject Teacher'}
                    </span>
                  </div>
                )) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Subject staffing has not been filled in for this class yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              We could not find the class staffing map for this student yet.
            </div>
          )}
        </div>

        {/* Performance Chart */}
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
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
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
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
                 className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 lg:gap-4 lg:rounded-xl lg:p-4"
               >
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                   <FileText size={20} />
                 </div>
                 <div className="min-w-0 flex-1">
                   <h4 className="break-words text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-700 lg:text-base lg:font-medium">{doc.title}</h4>
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
