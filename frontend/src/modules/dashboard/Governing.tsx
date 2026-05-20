import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  BarChart3,
  CheckCircle,
  ChevronRight,
  FileText,
  GraduationCap,
  Home,
  Search,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useClassStore } from '../../store/useClassStore';
import { fetchAttendanceOverview } from '../../services/attendance';
import type { IStudent } from '../../types/school';

type Tab = 'DASHBOARD' | 'ANALYTICS' | 'STUDENTS' | 'TEACHERS' | 'ATTENDANCE' | 'MARKS' | 'HOMEWORK';

const PIE_COLORS = ['#0f766e', '#e11d48'];

const viewToTab: Record<string, Tab> = {
  dashboard: 'DASHBOARD',
  overview: 'DASHBOARD',
  analytics: 'ANALYTICS',
  students: 'STUDENTS',
  teachers: 'TEACHERS',
  attendance: 'ATTENDANCE',
  marks: 'MARKS',
  homework: 'HOMEWORK',
};

const tabToView: Record<Tab, string> = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ATTENDANCE: 'attendance',
  MARKS: 'marks',
  HOMEWORK: 'homework',
};

const StatCard = ({ title, value, icon: Icon, bg, color, subtitle }: any) => (
  <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur transition-transform duration-200 active:scale-[0.98] sm:p-5 lg:rounded-[2rem]">
    <div className="flex items-center gap-3">
      <div className={`${bg} ${color} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="text-2xl font-black leading-none text-slate-950 sm:text-3xl">{value}</p>
      </div>
    </div>
    {subtitle && <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>}
  </div>
);

const SectionTitle = ({ label, action }: { label: string; action?: string }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="h-9 w-1.5 rounded-full bg-teal-600" />
    <div className="min-w-0">
      <h2 className="text-lg font-black text-slate-950">{label}</h2>
      <p className="text-xs font-semibold text-slate-400">Read-only executive view</p>
    </div>
    {action && (
      <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {action}
      </span>
    )}
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="min-w-0 rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:rounded-[2rem]">
    <SectionTitle label={title} />
    {children}
  </section>
);

export default function GoverningDashboard() {
  const store = useClassStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [activeGradeId, setActiveGradeId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [attendanceTrend, setAttendanceTrend] = useState<Array<{ day: string; present: number; absent: number }>>([]);
  const [classAttendance, setClassAttendance] = useState<Array<{ class: string; pct: number }>>([]);
  const [pieData, setPieData] = useState([{ name: 'Present', value: 0 }, { name: 'Absent', value: 0 }]);

  const tab = viewToTab[searchParams.get('view') || 'dashboard'] || 'DASHBOARD';

  const setTab = (nextTab: Tab) => {
    setSearchParams({ view: tabToView[nextTab] }, { replace: true });
  };

  const desktopTabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: Home },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
    { id: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { id: 'TEACHERS', label: 'Teachers', icon: Users },
    { id: 'ATTENDANCE', label: 'Attendance', icon: CheckCircle },
    { id: 'MARKS', label: 'Marks', icon: Award },
    { id: 'HOMEWORK', label: 'Homework', icon: FileText },
  ];

  const sectionLookup = useMemo(() => new Map(store.sections.map((section) => [section.id, section])), [store.sections]);
  const gradeLookup = useMemo(() => new Map(store.categories.map((category) => [category.id, category])), [store.categories]);

  const filteredTeachers = useMemo(
    () =>
      store.teachers.filter(
        (teacher) =>
          (filterClass === 'ALL' || teacher.category === filterClass) &&
          teacher.name.toLowerCase().includes(teacherSearch.toLowerCase())
      ),
    [store.teachers, filterClass, teacherSearch]
  );

  const filteredStudents = useMemo(
    () =>
      store.students.filter((student) => {
        const matchesGrade = !activeGradeId || student.categoryId === activeGradeId;
        const matchesSection = !activeSectionId || student.sectionId === activeSectionId;
        const matchesSearch =
          !studentSearch ||
          student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
          String(student.rollNo).toLowerCase().includes(studentSearch.toLowerCase());

        return matchesGrade && matchesSection && matchesSearch;
      }),
    [activeGradeId, activeSectionId, store.students, studentSearch]
  );

  const gradeSummaries = useMemo(
    () =>
      store.categories.map((category) => {
        const sections = store.sections.filter((section) => section.categoryId === category.id);
        const students = store.students.filter((student) => student.categoryId === category.id);
        return { category, sections, students };
      }),
    [store.categories, store.sections, store.students]
  );

  const activeGrade = activeGradeId ? gradeLookup.get(activeGradeId) : null;
  const activeSections = activeGradeId ? store.sections.filter((section) => section.categoryId === activeGradeId) : [];

  useEffect(() => {
    void fetchAttendanceOverview(7)
      .then((overview) => {
        setAttendanceTrend(
          overview.trend.map((point) => ({
            day: point.label,
            present: point.present,
            absent: point.absent,
          }))
        );
        setClassAttendance(
          overview.classBreakdown.map((point) => ({
            class: sectionLookup.get(point.classId)?.name || point.classId,
            pct: point.pct,
          }))
        );
        setPieData([
          { name: 'Present', value: overview.presentCount },
          { name: 'Absent', value: overview.absentCount },
        ]);
      })
      .catch(console.error);
  }, [sectionLookup]);

  const marksData = store.categories.map((category, index) => ({
    subject: category.name.length > 9 ? `${category.name.slice(0, 8)}.` : category.name,
    avg: 72 + index * 4,
  }));

  const hwData = store.categories.map((category, index) => ({
    class: category.name.length > 6 ? category.name.slice(0, 6) : category.name,
    done: Math.max(62, 82 - index * 2),
    pending: Math.min(38, 18 + index * 2),
  }));

  const studentHighlights = useMemo(() => store.students.slice(0, 6), [store.students]);

  const renderStudentCard = (student: IStudent) => (
    <article
      key={student.id}
      className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-base font-black text-white">
          {student.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-slate-950">{student.name}</h3>
          <p className="mt-0.5 text-xs font-bold text-slate-400">
            Roll {student.rollNo} · {sectionLookup.get(student.sectionId)?.name || 'Section'}
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-700">
          {student.gender}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Grade</p>
          <p className="mt-1 truncate text-slate-800">{gradeLookup.get(student.categoryId)?.name || student.categoryId}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Guardian</p>
          <p className="mt-1 truncate text-slate-800">{student.parentName || 'Not listed'}</p>
        </div>
      </div>
    </article>
  );

  return (
    <div className="governing-mobile-app min-w-0 space-y-5 pb-2 lg:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-5 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8 lg:rounded-[2.5rem] lg:px-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.35),transparent_55%)]" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex rounded-full bg-teal-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
            Governing Body Portal
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Executive School Command</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 sm:text-base">
            Fast mobile insights for principals, headmasters, management, and senior administrative staff.
          </p>
        </div>
      </section>

      <div className="hidden overflow-x-auto pb-1 lg:block">
        <div className="flex min-w-max gap-2">
          {desktopTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                tab === item.id ? 'bg-slate-950 text-white shadow-lg' : 'border border-slate-100 bg-white text-slate-500 hover:text-teal-700'
              }`}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-5 lg:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <StatCard title="Students" value={store.students.length} icon={GraduationCap} bg="bg-teal-50" color="text-teal-700" subtitle="Across all sections" />
            <StatCard title="Faculty" value={store.teachers.length} icon={Users} bg="bg-sky-50" color="text-sky-700" subtitle="Active staff directory" />
            <StatCard title="Sections" value={store.sections.length} icon={CheckCircle} bg="bg-emerald-50" color="text-emerald-700" subtitle="Operational classrooms" />
            <StatCard title="Levels" value={store.categories.length} icon={TrendingUp} bg="bg-amber-50" color="text-amber-700" subtitle="Grade structure" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Attendance Pulse">
                <div className="h-60 sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrend}>
                      <defs>
                        <linearGradient id="gb-teal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 18px 45px rgba(15,23,42,0.14)' }} />
                      <Area type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={3} fill="url(#gb-teal)" name="Present %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <ChartCard title="Live Registry">
              <div className="space-y-3">
                {studentHighlights.map((student, index) => (
                  <div key={student.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{student.name}</p>
                      <p className="text-xs font-bold text-slate-400">Roll {student.rollNo} · {sectionLookup.get(student.sectionId)?.name || 'Section'}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {(tab === 'ANALYTICS' || tab === 'ATTENDANCE') && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <ChartCard title="Weekly Attendance">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} name="Present %" />
                  <Line type="monotone" dataKey="absent" stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} name="Absent %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Class Attendance">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classAttendance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="class" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Bar dataKey="pct" fill="#0f766e" radius={[0, 10, 10, 0]} barSize={24} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Present vs Absent">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Academic Snapshot">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marksData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Bar dataKey="avg" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={30} name="Avg Marks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {tab === 'STUDENTS' && (
        <section className="space-y-4 rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:rounded-[2rem]">
          <SectionTitle label="Students" action={`${filteredStudents.length} shown`} />

          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search students or roll no..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <button
              onClick={() => {
                setActiveGradeId(null);
                setActiveSectionId(null);
              }}
              className={`rounded-full px-3 py-2 transition-all ${!activeGradeId ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Grades
            </button>
            {activeGrade && (
              <>
                <ChevronRight size={14} />
                <button
                  onClick={() => setActiveSectionId(null)}
                  className={`rounded-full px-3 py-2 transition-all ${!activeSectionId ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-700'}`}
                >
                  {activeGrade.name}
                </button>
              </>
            )}
            {activeSectionId && (
              <>
                <ChevronRight size={14} />
                <span className="rounded-full bg-sky-50 px-3 py-2 text-sky-700">
                  {sectionLookup.get(activeSectionId)?.name || 'Section'}
                </span>
              </>
            )}
          </div>

          {!activeGradeId && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gradeSummaries.map(({ category, sections, students }) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveGradeId(category.id);
                    setActiveSectionId(null);
                  }}
                  className="group rounded-[1.35rem] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:border-teal-200 lg:hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">Grade Box</p>
                      <h3 className="mt-2 truncate text-xl font-black text-slate-950">{category.name}</h3>
                    </div>
                    <div className="rounded-2xl bg-teal-50 p-3 text-teal-700 transition-transform group-hover:translate-x-0.5">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                      <p className="text-lg font-black text-slate-950">{sections.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classes</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
                      <p className="text-lg font-black text-slate-950">{students.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Students</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeGradeId && !activeSectionId && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeSections.map((section) => {
                const count = store.students.filter((student) => student.sectionId === section.id).length;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className="rounded-[1.35rem] border border-slate-100 bg-white p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:border-sky-200 lg:hover:shadow-lg"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Class Box</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{section.name}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-400">Room {section.roomNumber || '-'} · {section.classTeacher || 'No teacher'}</p>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-xl font-black text-sky-700">
                        {count}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeSectionId && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map(renderStudentCard)}
            </div>
          )}

          {activeSectionId && !filteredStudents.length && (
            <div className="rounded-[1.5rem] bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-black text-slate-700">No students found for this class.</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Try clearing the search field or choosing another class.</p>
            </div>
          )}
        </section>
      )}

      {tab === 'TEACHERS' && (
        <section className="space-y-4 rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:rounded-[2rem]">
          <SectionTitle label="Faculty Directory" action={`${filteredTeachers.length} shown`} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search faculty..."
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              />
            </div>
            <select
              value={filterClass}
              onChange={(event) => setFilterClass(event.target.value)}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            >
              <option value="ALL">All Classes</option>
              {store.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredTeachers.slice(0, 60).map((teacher) => (
              <article key={teacher.id} className="rounded-[1.35rem] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-black text-teal-700 shadow-sm">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-950">{teacher.name}</h3>
                    <p className="truncate text-xs font-bold text-slate-400">{teacher.subject}</p>
                  </div>
                </div>
                <p className="mt-4 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500">{teacher.experience} · {teacher.qualification}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'MARKS' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Subject Performance">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marksData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Bar dataKey="avg" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={32} name="Avg Marks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Class Average">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={marksData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} domain={[60, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                  <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} name="Class Avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {tab === 'HOMEWORK' && (
        <ChartCard title="Homework Completion">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hwData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="class" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                <Legend />
                <Bar dataKey="done" stackId="a" fill="#0f766e" name="Completed %" barSize={34} />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[10, 10, 0, 0]} name="Pending %" barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <div className="pb-3 pt-1 text-center">
        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 shadow-sm">
          <Shield size={12} /> Governing Body · Read-Only Executive Access
        </span>
      </div>
    </div>
  );
}
