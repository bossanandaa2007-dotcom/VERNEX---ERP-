import { Users, BookOpen, UserCheck, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/useClassStore';
import { useEffect, useMemo, useState } from 'react';
import { fetchTimetableEntries, type TimetableEntry } from '../../services/timetable';

const formatScheduleTime = (entry: TimetableEntry) => {
  if (entry.startTime) {
    const [hours = '0', minutes = '00'] = entry.startTime.split(':');
    const numericHours = Number(hours);
    const suffix = numericHours >= 12 ? 'PM' : 'AM';
    const twelveHour = numericHours % 12 || 12;
    return `${String(twelveHour).padStart(2, '0')}:${minutes} ${suffix}`;
  }

  return `Period ${entry.periodNumber}`;
};

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const students = useClassStore((state) => state.students);
  const navigate = useNavigate();
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
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

  useEffect(() => {
    let ignore = false;

    const updateSchedule = (items: TimetableEntry[]) => {
      if (!ignore) {
        setTodaySchedule(items);
      }
    };

    if (!user?.id || user.role !== 'Teacher') {
      window.requestAnimationFrame(() => updateSchedule([]));
      return;
    }

    const today = new Date().getDay();
    if (today === 0) {
      window.requestAnimationFrame(() => updateSchedule([]));
      return;
    }

    const loadingFrame = window.requestAnimationFrame(() => setIsScheduleLoading(true));
    void fetchTimetableEntries({ teacherProfileId: user.id })
      .then((entries) => {
        updateSchedule(
          entries
            .filter((entry) => entry.dayOfWeek === today)
            .sort((left, right) => {
              if (left.startTime && right.startTime) {
                return left.startTime.localeCompare(right.startTime);
              }
              return left.periodNumber - right.periodNumber;
            })
        );
      })
      .catch((error) => {
        console.error('Failed to load teacher schedule:', error);
        updateSchedule([]);
      })
      .finally(() => {
        window.cancelAnimationFrame(loadingFrame);
        setIsScheduleLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user?.id, user?.role]);

  const totalStudents = useMemo(() => {
    const matchingSections = sections.filter((section) => assignedClasses.includes(section.name)).map((section) => section.id);
    return students.filter((student) => matchingSections.includes(student.sectionId)).length;
  }, [assignedClasses, sections, students]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  );

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Teacher Workspace</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{user?.name?.split(' ')[0] || 'Teacher'}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden">
          <button onClick={() => navigate('/teacher/attendance')} className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-950 active:scale-[0.99]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Daily</p>
            <p className="mt-1 text-sm font-semibold">Attendance</p>
          </button>
          <button onClick={() => navigate('/teacher/academics')} className="rounded border border-[#4653a6] bg-[#4653a6] px-4 py-3 text-left text-white active:scale-[0.99]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Open</p>
            <p className="mt-1 text-sm font-semibold">Academics</p>
          </button>
        </div>
      </div>
      <div className="hidden border-b border-slate-200 pb-4 lg:block">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Dashboard</h1>
        <p className="text-slate-500 mt-1">Attendance, timetable, marks, assignments, and class operations.</p>
      </div>

      <div className="border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Class Teacher Assignment</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">{ownedClass || 'No owned class assigned'}</h2>
          <button
            onClick={() => navigate('/teacher/classes')}
            className="inline-flex w-fit items-center gap-2 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            Open Roster <ChevronRight size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-800">
          Student add/remove controls are enabled only for this class. Subject classes are view-only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {[
          { title: 'Owned Class', value: ownedClass || 'None', icon: UserCheck, color: 'bg-emerald-500' },
          { title: 'Assigned Classes', value: assignedClasses.length.toString(), icon: BookOpen, color: 'bg-indigo-500' },
          { title: 'Total Students', value: totalStudents.toString(), icon: Users, color: 'bg-blue-500' },
          { title: 'Study Materials', value: '12 Items', icon: FileText, color: 'bg-amber-500', path: '/teacher/materials' },
          { title: 'Upcoming Events', value: '2', icon: Calendar, color: 'bg-violet-500', path: '/teacher/events' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.path && navigate(stat.path)}
            className={`flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-sm transition-colors lg:flex-row lg:items-center lg:gap-4 ${
              stat.path ? 'cursor-pointer hover:border-blue-300 hover:bg-slate-50' : ''
            }`}
          >
             <div className={`w-fit rounded p-2.5 lg:p-3 ${stat.color} text-white shrink-0`}>
                <stat.icon size={20} />
              </div>
            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{stat.title}</h3>
              <p className="mt-0.5 text-lg font-semibold text-slate-900 lg:text-xl">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Class Subject Staffing</h2>
              <p className="text-sm text-slate-500 mt-1">
                Full staffing for the class where you are the class teacher.
              </p>
            </div>
          </div>
          {ownedSection ? (
            <div className="space-y-4">
              <div className="rounded border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Class Teacher</p>
                <p className="mt-1 text-base font-bold text-slate-900">{ownedSection.classTeacher}</p>
              </div>
              <div className="space-y-3">
                {(ownedSection.subjectTeachers || []).length ? ownedSection.subjectTeachers?.map((teacher) => (
                  <div key={`${teacher.subject}:${teacher.id}`} className="flex items-center justify-between border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{teacher.subject}</p>
                      <p className="text-xs text-slate-500">Handled by {teacher.name}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${teacher.name === ownedSection.classTeacher ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {teacher.name === ownedSection.classTeacher ? 'You own this class' : 'Subject Teacher'}
                    </span>
                  </div>
                )) : (
                  <div className="rounded border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No subject staffing is available for your owned class yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No owned class is assigned to this teacher account yet.
            </div>
          )}
        </div>

        {/* Today's Schedule */}
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
            <span className="text-sm font-medium text-slate-500">{todayLabel}</span>
          </div>
          <div className="space-y-4">
             {isScheduleLoading ? (
               <div className="text-center py-8 text-slate-500">Loading timetable...</div>
             ) : todaySchedule.length > 0 ? (
               todaySchedule.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 border border-slate-200 p-3 transition-colors hover:bg-slate-50 lg:gap-4">
                    <div className="w-20 shrink-0 text-center">
                      <span className="block text-sm font-semibold text-[#3f5f9f]">{formatScheduleTime(entry)}</span>
                    </div>
                    <div className="h-12 w-px bg-slate-200"></div>
                    <div className="flex-1 flex min-w-0 items-center justify-between gap-3 pr-1 lg:pr-2">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">{entry.sectionName}</h4>
                        <p className="text-sm text-slate-500">{entry.subject}</p>
                      </div>
                      <span className="hidden rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                        P{entry.periodNumber}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">No timetable periods scheduled for today.</div>
              )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
           <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Pending Actions</h2>
          </div>
          <div className="space-y-3">
            {assignedClasses[0] && (
              <button 
                onClick={() => navigate('/teacher/attendance')}
                className="flex w-full items-center justify-between rounded border border-rose-200 bg-rose-50 p-4 text-left transition-colors hover:bg-rose-100"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded bg-white p-2 text-rose-600">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-rose-900">Mark Attendance: {assignedClasses[0]}</h4>
                    <p className="text-xs text-rose-600 mt-0.5">Due in 30 mins</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-rose-700">Action Required -&gt;</span>
              </button>
            )}
            {assignedClasses[1] && (
              <button 
                onClick={() => navigate('/teacher/assignments')}
                className="flex w-full items-center justify-between rounded border border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded bg-white p-2 text-blue-700">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-950">Update Marks: Mid-Term Exam</h4>
                    <p className="mt-0.5 text-xs text-blue-700">{assignedClasses[1]} {teacherSubjectLabel}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-700">Start -&gt;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TeacherDashboard;
