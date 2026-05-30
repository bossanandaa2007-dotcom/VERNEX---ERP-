import { Users, BookOpen, UserCheck, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/useClassStore';
import { useEffect, useMemo } from 'react';

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const students = useClassStore((state) => state.students);
  const navigate = useNavigate();
  const assignedClasses = useMemo(() => user?.classes || [], [user?.classes]);
  const ownedClass = user?.class;
  const teacherSubjectLabel = user?.subjects?.length ? user.subjects.join(', ') : (user?.subject || 'General');
  const ownedSection = useMemo(
    () => sections.find((section) => section.name === ownedClass) || null,
    [ownedClass, sections]
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const totalStudents = useMemo(() => {
    const matchingSections = sections.filter((section) => assignedClasses.includes(section.name)).map((section) => section.id);
    return students.filter((student) => matchingSections.includes(student.sectionId)).length;
  }, [assignedClasses, sections, students]);

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="rounded-[2rem] bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-200 lg:hidden">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-200">Today</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'Teacher'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Manage your classroom, attendance, and academic resources.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden">
          <button onClick={() => navigate('/teacher/attendance')} className="rounded-2xl bg-white px-4 py-3 text-left text-slate-950 active:scale-[0.98]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick</p>
            <p className="mt-1 text-sm font-black">Attendance</p>
          </button>
          <button onClick={() => navigate('/teacher/academics')} className="rounded-2xl bg-indigo-500 px-4 py-3 text-left text-white active:scale-[0.98]">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Open</p>
            <p className="mt-1 text-sm font-black">Academics</p>
          </button>
        </div>
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}. Manage your classroom and digital resources.</p>
      </div>

      <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/80 px-5 py-5 shadow-sm lg:rounded-3xl lg:px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Class Teacher Ownership</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black text-slate-900">{ownedClass || 'No owned class assigned'}</h2>
          <button
            onClick={() => navigate('/teacher/classes')}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition-colors active:scale-95 hover:bg-emerald-700"
          >
            Open Roster <ChevronRight size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Student add/remove controls are enabled only for this class. Subject classes are view-only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
        {[
          { title: 'Owned Class', value: ownedClass || 'None', icon: UserCheck, color: 'bg-emerald-500', path: '/teacher/classes' },
          { title: 'Assigned Classes', value: assignedClasses.length.toString(), icon: BookOpen, color: 'bg-indigo-500', path: '/teacher/classes' },
          { title: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'bg-blue-500', path: '/teacher/classes' },
          { title: 'Study Materials', value: '12 Items', icon: FileText, color: 'bg-amber-500', path: '/teacher/materials' },
          { title: 'Upcoming Events', value: '2', icon: Calendar, color: 'bg-violet-500', path: '/teacher/events' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => navigate(stat.path)}
            className="flex cursor-pointer flex-col gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm transition-all active:scale-[0.98] lg:flex-row lg:items-center lg:gap-4 lg:rounded-2xl lg:p-6 lg:hover:shadow-md"
          >
             <div className={`w-fit p-3 lg:p-4 rounded-xl ${stat.color} text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                <stat.icon size={20} />
              </div>
            <div>
              <h3 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{stat.title}</h3>
              <p className="text-lg font-extrabold text-slate-900 mt-0.5 lg:text-xl">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Owned Class Subject Map</h2>
              <p className="text-sm text-slate-500 mt-1">
                Full staffing for the class where you are the class teacher.
              </p>
            </div>
          </div>
          {ownedSection ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Class Teacher</p>
                <p className="mt-1 text-base font-bold text-slate-900">{ownedSection.classTeacher}</p>
              </div>
              <div className="space-y-3">
                {(ownedSection.subjectTeachers || []).length ? ownedSection.subjectTeachers?.map((teacher) => (
                  <div key={`${teacher.subject}:${teacher.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{teacher.subject}</p>
                      <p className="text-xs text-slate-500">Handled by {teacher.name}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${teacher.name === ownedSection.classTeacher ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {teacher.name === ownedSection.classTeacher ? 'You own this class' : 'Subject Teacher'}
                    </span>
                  </div>
                )) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No subject staffing is available for your owned class yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No owned class is assigned to this teacher account yet.
            </div>
          )}
        </div>

        {/* Today's Schedule */}
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
            <span className="text-sm font-medium text-slate-500">April 2, 2026</span>
          </div>
          <div className="space-y-4">
             {assignedClasses.length > 0 ? (
               assignedClasses.map((cls, i) => (
                 <div key={i} className="flex gap-3 items-center rounded-2xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 lg:gap-4 lg:rounded-xl">
                   <div className="w-20 shrink-0 text-center">
                     <span className="text-sm font-bold text-indigo-600 block">{i === 0 ? '09:00 AM' : i === 1 ? '11:30 AM' : '02:00 PM'}</span>
                   </div>
                   <div className="w-1 h-12 bg-indigo-100 rounded-full"></div>
                   <div className="flex-1 flex min-w-0 items-center justify-between gap-3 pr-1 lg:pr-2">
                     <div>
                       <h4 className="text-base font-semibold text-slate-900">{cls}</h4>
                       <p className="text-sm text-slate-500">{teacherSubjectLabel}</p>
                     </div>
                     <span className="hidden px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 sm:inline-flex">
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
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm lg:rounded-2xl lg:p-6">
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
                    <p className="text-xs text-indigo-600 mt-0.5">{assignedClasses[1]} {teacherSubjectLabel}</p>
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
