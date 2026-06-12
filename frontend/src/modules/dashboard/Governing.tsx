import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  BarChart3,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Home,
  Search,
  Shield,
  TrendingUp,
  Users,
  type LucideIcon,
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
import { useAuthStore } from '../../store/useAuthStore';
import { fetchAttendanceOverview } from '../../services/attendance';
import type { AttendanceOverviewRange, AttendanceRegistryRow } from '../../services/attendance';
import { fetchGoverningMarksOverview, MARK_EXAMS } from '../../services/marks';
import type { ExamType, GoverningMarksOverview } from '../../services/marks';
import type { IStudent } from '../../types/school';

type Tab = 'DASHBOARD' | 'ANALYTICS' | 'STUDENTS' | 'TEACHERS' | 'ATTENDANCE' | 'MARKS';

const PIE_COLORS = ['#0f766e', '#e11d48'];
const GOVERNING_CHART_INITIAL_DIMENSION = { width: 320, height: 220 };
const ATTENDANCE_FILTERS: Array<{ id: AttendanceOverviewRange; label: string }> = [
  { id: 'overall', label: 'Overall' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Past week' },
  { id: 'month', label: 'Past month' },
  { id: 'twoMonthsAgo', label: '2 months ago' },
];

const emptyMarksOverview: GoverningMarksOverview = {
  groups: [],
  sections: [],
  subjects: [],
  subjectPerformance: [],
  classAverage: [],
  totalRecords: 0,
  averagePercent: 0,
};

const viewToTab: Record<string, Tab> = {
  dashboard: 'DASHBOARD',
  overview: 'DASHBOARD',
  analytics: 'ANALYTICS',
  students: 'STUDENTS',
  teachers: 'TEACHERS',
  attendance: 'ATTENDANCE',
  marks: 'MARKS',
};

const tabToView: Record<Tab, string> = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ATTENDANCE: 'attendance',
  MARKS: 'marks',
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  bg: string;
  color: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon: Icon, bg, color, subtitle }: StatCardProps) => (
  <div className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center gap-3">
      <div className={`${bg} ${color} flex h-11 w-11 shrink-0 items-center justify-center rounded`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-semibold leading-none text-slate-950 sm:text-3xl">{value}</p>
      </div>
    </div>
    {subtitle && <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>}
  </div>
);

const SectionTitle = ({ label, action }: { label: string; action?: string }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="h-7 w-1 bg-teal-700" />
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-slate-950">{label}</h2>
      <p className="text-xs font-semibold text-slate-500">Read-only institutional view</p>
    </div>
    {action && (
      <span className="ml-auto rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {action}
      </span>
    )}
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="min-w-0 overflow-hidden border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <SectionTitle label={title} />
    {children}
  </section>
);

const ChartFrame = ({ children, className = 'h-[260px] sm:h-64' }: { children: ReactNode; className?: string }) => (
  <div className={`${className} w-full min-w-0 overflow-hidden`}>
    {children}
  </div>
);

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-full min-h-[180px] items-center justify-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-bold text-slate-400">
    {message}
  </div>
);

const MobileAttendanceAreaChart = ({ data }: { data: Array<{ day: string; present: number; total: number }> }) => {
  const width = 320;
  const height = 190;
  const padding = { top: 16, right: 10, bottom: 34, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = data.map((point, index) => {
    const x = padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (Math.min(Math.max(point.present, 0), 100) / 100) * plotHeight;
    return { ...point, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : '';
  const labels = points.filter((_, index) => data.length <= 4 || index === 0 || index === data.length - 1 || index % 2 === 0);

  return (
    <div className="h-full min-h-[210px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Attendance pulse chart">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + plotHeight - (tick / 100) * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-semibold">
                {tick}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill="#0f766e" opacity="0.14" />}
        {linePath && <path d={linePath} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point) => (
          <circle key={`${point.day}-${point.x}`} cx={point.x} cy={point.y} r="3" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />
        ))}
        {labels.map((point) => (
          <text key={`${point.day}-label`} x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">
            {point.day}
          </text>
        ))}
      </svg>
    </div>
  );
};

const clampPercent = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);

const MobileAttendanceTrendChart = ({ data }: { data: Array<{ day: string; present: number; absent: number; total: number }> }) => {
  const width = 320;
  const height = 210;
  const padding = { top: 16, right: 12, bottom: 48, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const toPoints = (key: 'present' | 'absent') => data.map((point, index) => ({
    label: point.day,
    x: padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: padding.top + plotHeight - (clampPercent(point[key]) / 100) * plotHeight,
  }));
  const toPath = (points: Array<{ x: number; y: number }>) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const presentPoints = toPoints('present');
  const absentPoints = toPoints('absent');

  return (
    <div className="h-full min-h-[220px] w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Attendance trend chart">
        {[0, 50, 100].map((tick) => {
          const y = padding.top + plotHeight - (tick / 100) * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-semibold">{tick}</text>
            </g>
          );
        })}
        <path d={toPath(presentPoints)} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={toPath(absentPoints)} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {presentPoints.map((point, index) => <circle key={`present-${point.label}-${index}`} cx={point.x} cy={point.y} r="3" fill="#0f766e" />)}
        {absentPoints.map((point, index) => <circle key={`absent-${point.label}-${index}`} cx={point.x} cy={point.y} r="3" fill="#e11d48" />)}
        {presentPoints.map((point, index) => (
          <text key={`${point.label}-label-${index}`} x={point.x} y={height - 26} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">
            {data.length <= 5 || index % 2 === 0 ? point.label : ''}
          </text>
        ))}
        <rect x="92" y={height - 10} width="9" height="3" fill="#e11d48" /><text x="106" y={height - 6} className="fill-rose-600 text-[10px]">Absent %</text>
        <rect x="178" y={height - 10} width="9" height="3" fill="#0f766e" /><text x="192" y={height - 6} className="fill-teal-700 text-[10px]">Present %</text>
      </svg>
    </div>
  );
};

const MobileHorizontalBarChart = ({ data }: { data: Array<{ class: string; pct: number; total?: number }> }) => (
  <div className="space-y-3 py-2">
    {data.map((row, index) => (
      <div key={`${row.class}-${index}`} className="grid grid-cols-[56px_1fr_44px] items-center gap-2 text-xs font-semibold">
        <span className="truncate text-slate-600">{row.class}</span>
        <div className="h-3 rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-teal-700" style={{ width: `${clampPercent(row.pct)}%` }} />
        </div>
        <span className="text-right text-slate-700">{Math.round(row.pct)}%</span>
      </div>
    ))}
  </div>
);

const MobileDonutChart = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const present = data.find((point) => point.name === 'Present')?.value || 0;
  const presentPct = total ? Math.round((present / total) * 100) : 0;
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4">
      <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#0f766e 0 ${presentPct}%, #e11d48 ${presentPct}% 100%)` }}>
        <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">{presentPct}%</div>
      </div>
      <div className="flex gap-4 text-xs font-semibold">
        {data.map((point, index) => (
          <span key={point.name} className={index === 0 ? 'text-teal-700' : 'text-rose-600'}>
            {point.name}: {point.value}
          </span>
        ))}
      </div>
    </div>
  );
};

const MobileVerticalBarChart = ({ data, labelKey, valueKey, color = '#2563eb' }: { data: Array<Record<string, string | number>>; labelKey: string; valueKey: string; color?: string }) => (
  <div className="flex h-full min-h-[220px] items-end gap-2 overflow-x-auto px-1 pb-2 pt-4">
    {data.map((row, index) => {
      const label = String(row[labelKey]);
      const value = clampPercent(Number(row[valueKey]));
      return (
        <div key={`${label}-${index}`} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
          <div className="flex h-36 w-full items-end rounded bg-slate-50">
            <div className="w-full rounded-t" style={{ height: `${value}%`, backgroundColor: color }} />
          </div>
          <span className="max-w-16 truncate text-[10px] font-semibold text-slate-500">{label}</span>
        </div>
      );
    })}
  </div>
);

const AttendanceFilter = ({ value, onChange }: { value: AttendanceOverviewRange; onChange: (value: AttendanceOverviewRange) => void }) => (
  <div className="mb-4 flex flex-wrap gap-2">
    {ATTENDANCE_FILTERS.map((filter) => (
      <button
        key={filter.id}
        onClick={() => onChange(filter.id)}
        className={`shrink-0 rounded border px-3 py-2 text-[11px] font-semibold transition-colors ${
          value === filter.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {filter.label}
      </button>
    ))}
  </div>
);

const GradeFilter = ({
  categories,
  value,
  onChange,
}: {
  categories: Array<{ id: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="mb-4 flex flex-wrap gap-2">
    <button
      onClick={() => onChange('ALL')}
      className={`rounded border px-3 py-2 text-[11px] font-semibold transition-colors ${
        value === 'ALL' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      All classes
    </button>
    {categories.map((category) => (
      <button
        key={category.id}
        onClick={() => onChange(category.id)}
        className={`rounded border px-3 py-2 text-[11px] font-semibold transition-colors ${
          value === category.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {category.name}
      </button>
    ))}
  </div>
);

export default function GoverningDashboard() {
  const store = useClassStore();
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [activeGradeId, setActiveGradeId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<AttendanceOverviewRange>('week');
  const [attendanceTrend, setAttendanceTrend] = useState<Array<{ day: string; present: number; absent: number; total: number }>>([]);
  const [classAttendance, setClassAttendance] = useState<Array<{ classId: string; class: string; pct: number; total: number }>>([]);
  const [attendanceGradeId, setAttendanceGradeId] = useState('ALL');
  const [pieData, setPieData] = useState([{ name: 'Present', value: 0 }, { name: 'Absent', value: 0 }]);
  const [liveRegistry, setLiveRegistry] = useState<AttendanceRegistryRow[]>([]);
  const [attendanceError, setAttendanceError] = useState('');
  const [marksOverview, setMarksOverview] = useState<GoverningMarksOverview>(emptyMarksOverview);
  const [marksGroupId, setMarksGroupId] = useState('All');
  const [marksSectionId, setMarksSectionId] = useState('All');
  const [marksSubject, setMarksSubject] = useState('All');
  const [marksExamType, setMarksExamType] = useState<ExamType | 'All'>('All');
  const [useDesktopCharts, setUseDesktopCharts] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  );

  const tab = viewToTab[searchParams.get('view') || 'dashboard'] || 'DASHBOARD';

  const setTab = (nextTab: Tab) => {
    setSearchParams({ view: tabToView[nextTab] }, { replace: true });
  };

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setUseDesktopCharts(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const desktopTabs: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: Home },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
    { id: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { id: 'TEACHERS', label: 'Teachers', icon: Users },
    { id: 'ATTENDANCE', label: 'Attendance', icon: CheckCircle },
    { id: 'MARKS', label: 'Marks', icon: Award },
  ];

  const sectionLookup = useMemo(() => new Map(store.sections.map((section) => [section.id, section])), [store.sections]);
  const sectionNameLookup = useMemo(() => new Map(store.sections.map((section) => [section.name, section])), [store.sections]);
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
    const days = attendanceRange === 'today' ? 1 : attendanceRange === 'week' ? 7 : attendanceRange === 'month' ? 30 : attendanceRange === 'overall' ? 0 : 60;

    void fetchAttendanceOverview(days, attendanceRange)
      .then((overview) => {
        setAttendanceError('');

        if (attendanceRange === 'overall') {
          // show only months for current year
          const currentYear = new Date().getFullYear();
          const currentMonthIndex = new Date().getMonth();
          const monthsMap = new Map();

          for (let m = 0; m <= currentMonthIndex; m += 1) {
            const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
            monthsMap.set(key, { presentCount: 0, absentCount: 0, total: 0 });
          }

          overview.trend.forEach((row) => {
            if (row.date.slice(0, 4) !== String(currentYear)) return;
            const monthKey = row.date.slice(0, 7);
            const current = monthsMap.get(monthKey) || { presentCount: 0, absentCount: 0, total: 0 };
            current.presentCount += row.presentCount;
            current.absentCount += row.absentCount;
            current.total += row.total;
            monthsMap.set(monthKey, current);
          });

          const entries = Array.from(monthsMap.entries()).map(([monthKey, stats]) => {
            const iso = `${monthKey}-01`;
            const label = new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            const present = stats.total ? Math.round((stats.presentCount / stats.total) * 1000) / 10 : 0;
            const absent = stats.total ? Math.round((stats.absentCount / stats.total) * 1000) / 10 : 0;
            return { day: label, present, absent, total: stats.total };
          });

          setAttendanceTrend(entries);
        } else {
          setAttendanceTrend(
            overview.trend.map((point) => ({
              day: attendanceRange === 'week' ? point.label : point.date.slice(5),
              present: point.present,
              absent: point.absent,
              total: point.total,
            }))
          );
        }
        setClassAttendance(
          overview.classBreakdown.map((point) => ({
            classId: point.classId,
            class: sectionLookup.get(point.classId)?.name || sectionNameLookup.get(point.classId)?.name || point.classId,
            pct: point.pct,
            total: point.total,
          }))
        );
        setPieData([
          { name: 'Present', value: overview.presentCount },
          { name: 'Absent', value: overview.absentCount },
        ]);
        setLiveRegistry(overview.liveRegistry);
      })
      .catch((error) => {
        console.error(error);
        setAttendanceError('Attendance data could not be loaded.');
        setAttendanceTrend([]);
        setClassAttendance([]);
        setPieData([{ name: 'Present', value: 0 }, { name: 'Absent', value: 0 }]);
        setLiveRegistry([]);
      });
  }, [attendanceRange, sectionLookup, sectionNameLookup]);

  useEffect(() => {
    void fetchGoverningMarksOverview({
      groupId: marksGroupId,
      sectionId: marksSectionId,
      subject: marksSubject,
      examType: marksExamType,
    })
      .then(setMarksOverview)
      .catch(console.error);
  }, [marksExamType, marksGroupId, marksSectionId, marksSubject]);

  const marksSections = useMemo(
    () => marksOverview.sections.filter((section) => marksGroupId === 'All' || section.groupId === marksGroupId),
    [marksGroupId, marksOverview.sections]
  );

  const classAttendanceData = useMemo(() => {
    const selectedSections = attendanceGradeId === 'ALL'
      ? store.sections
      : store.sections.filter((section) => section.categoryId === attendanceGradeId);
    const attendanceByClass = new Map(classAttendance.map((point) => [point.classId, point]));

    if (!selectedSections.length) {
      return classAttendance.sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }));
    }

    return selectedSections
      .map((section) => {
        const point = attendanceByClass.get(section.id) || attendanceByClass.get(section.name);

        return {
          classId: section.id,
          class: section.name,
          pct: point?.pct || 0,
          total: point?.total || 0,
        };
      })
      .sort((a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }));
  }, [attendanceGradeId, classAttendance, store.sections]);
  const academicSnapshotData = useMemo(
    () =>
      marksOverview.classAverage
        .map((row) => ({
          subject: row.class,
          avg: row.avg,
          records: row.records,
        }))
        .sort((left, right) => right.records - left.records || right.avg - left.avg)
        .slice(0, 8),
    [marksOverview.classAverage]
  );
  const hasAttendanceTrend = attendanceTrend.some((point) => point.total > 0);
  const hasClassAttendance = classAttendanceData.some((point) => point.total > 0);

  const renderStudentCard = (student: IStudent) => (
    <article key={student.id} className="border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-800 text-base font-semibold text-white">
          {student.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-slate-950">{student.name}</h3>
          <p className="mt-0.5 text-xs font-bold text-slate-400">
            Roll {student.rollNo} · {sectionLookup.get(student.sectionId)?.name || 'Section'}
          </p>
        </div>
        <span className="rounded bg-teal-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
          {student.gender}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
        <div className="rounded bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Grade</p>
          <p className="mt-1 truncate text-slate-800">{gradeLookup.get(student.categoryId)?.name || student.categoryId}</p>
        </div>
        <div className="rounded bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Guardian</p>
          <p className="mt-1 truncate text-slate-800">{student.parentName || 'Not listed'}</p>
        </div>
      </div>
    </article>
  );

  return (
    <div className="governing-mobile-app min-w-0 space-y-5 pb-24 lg:space-y-6 lg:pb-2">
      <section className="border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
          <span className="inline-flex rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
            Governing Body Portal
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Institutional Overview</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
            Read-only summaries for attendance, academics, enrollment, staffing, and institutional reports.
          </p>
          </div>
          <div className="text-sm font-medium text-slate-500 lg:text-right">
            <p className="font-semibold text-slate-900">{user?.name || 'Governing Body'}</p>
            <p>{user?.designation || 'Governing Body'}</p>
            <p className="text-xs uppercase tracking-wide">{user?.role || 'Governing Body'}</p>
          </div>
        </div>
      </section>

      <div className="hidden overflow-x-auto pb-1 lg:block">
        <div className="flex min-w-max gap-2">
          {desktopTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === item.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
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
                <AttendanceFilter value={attendanceRange} onChange={setAttendanceRange} />
                <ChartFrame className="h-[220px] sm:h-[300px]">
                  {attendanceError ? (
                    <EmptyChart message={attendanceError} />
                  ) : !hasAttendanceTrend ? (
                    <EmptyChart message="No attendance records for this period." />
                  ) : !useDesktopCharts ? (
                    <MobileAttendanceAreaChart data={attendanceTrend} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                      <AreaChart data={attendanceTrend}>
                        <defs>
                          <linearGradient id="gb-teal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 18px 45px rgba(15,23,42,0.14)' }} />
                        <Area type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={3} fill="url(#gb-teal)" name="Present %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartFrame>
              </ChartCard>
            </div>

            <ChartCard title="Live Registry">
              <div className="space-y-3">
                {liveRegistry.map((record, index) => (
                  <div key={record.id} className="flex items-center gap-3 rounded bg-slate-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-sm font-semibold text-slate-900 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{record.studentName}</p>
                      <p className="text-xs font-bold text-slate-400">{sectionLookup.get(record.classId)?.name || record.classId} - {record.attendanceDate}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {record.status}
                    </span>
                  </div>
                ))}
                {!liveRegistry.length && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-400">
                    No attendance records for this filter.
                  </div>
                )}
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {(tab === 'ANALYTICS' || tab === 'ATTENDANCE') && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <ChartCard title="Attendance Trend">
            <AttendanceFilter value={attendanceRange} onChange={setAttendanceRange} />
            <ChartFrame>
              {hasAttendanceTrend ? (
                !useDesktopCharts ? (
                  <MobileAttendanceTrendChart data={attendanceTrend} />
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} name="Present %" />
                    <Line type="monotone" dataKey="absent" stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} name="Absent %" />
                  </LineChart>
                </ResponsiveContainer>
                )
              ) : (
                <EmptyChart message="No attendance records for this period." />
              )}
            </ChartFrame>
          </ChartCard>

          <ChartCard title="Class Attendance">
            <AttendanceFilter value={attendanceRange} onChange={setAttendanceRange} />
            <GradeFilter categories={store.categories} value={attendanceGradeId} onChange={setAttendanceGradeId} />
            <ChartFrame>
              {hasClassAttendance ? (
                !useDesktopCharts ? (
                  <MobileHorizontalBarChart data={classAttendanceData} />
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                  <BarChart data={classAttendanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis dataKey="class" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                    <Bar dataKey="pct" fill="#0f766e" radius={[0, 10, 10, 0]} barSize={24} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
                )
              ) : (
                <EmptyChart message="No section attendance records for this class and period." />
              )}
            </ChartFrame>
          </ChartCard>

          <ChartCard title="Present vs Absent">
            <AttendanceFilter value={attendanceRange} onChange={setAttendanceRange} />
            <ChartFrame>
              {pieData.some((point) => point.value > 0) ? (
                !useDesktopCharts ? (
                  <MobileDonutChart data={pieData} />
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
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
                )
              ) : (
                <EmptyChart message="No present or absent records for this period." />
              )}
            </ChartFrame>
          </ChartCard>

          <ChartCard title="Academic Snapshot">
            <ChartFrame>
              {academicSnapshotData.length ? (
                !useDesktopCharts ? (
                  <MobileVerticalBarChart data={academicSnapshotData} labelKey="subject" valueKey="avg" />
                ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                  <BarChart data={academicSnapshotData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                    <Bar dataKey="avg" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={30} name="Avg Marks" />
                  </BarChart>
                </ResponsiveContainer>
                )
              ) : (
                <EmptyChart message="No academic marks records available yet." />
              )}
            </ChartFrame>
          </ChartCard>
        </div>
      )}

      {tab === 'STUDENTS' && (
        <section className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                  className="group border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-teal-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Grade</p>
                      <h3 className="mt-2 truncate text-xl font-semibold text-slate-950">{category.name}</h3>
                    </div>
                    <div className="rounded bg-teal-50 p-3 text-teal-700">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-lg font-semibold text-slate-950">{sections.length}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Classes</p>
                    </div>
                    <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-lg font-semibold text-slate-950">{students.length}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Students</p>
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
                    className="border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-sky-300 hover:bg-slate-50"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Class</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">{section.name}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-400">Room {section.roomNumber || '-'} · {section.classTeacher || 'No teacher'}</p>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sky-50 text-xl font-semibold text-sky-700">
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
            <div className="rounded bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No students found for this class.</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Try clearing the search field or choosing another class.</p>
            </div>
          )}
        </section>
      )}

      {tab === 'TEACHERS' && (
        <section className="space-y-4 border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
              <article key={teacher.id} className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white text-base font-semibold text-teal-700 shadow-sm">
                    {teacher.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{teacher.name}</h3>
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
        <div className="space-y-5">
          <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select value={marksGroupId} onChange={(event) => { setMarksGroupId(event.target.value); setMarksSectionId('All'); }} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                <option value="All">All subject groups</option>
                {marksOverview.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <select value={marksSectionId} onChange={(event) => setMarksSectionId(event.target.value)} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                <option value="All">All sections</option>
                {marksSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
              <select value={marksSubject} onChange={(event) => setMarksSubject(event.target.value)} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                <option value="All">All subjects</option>
                {marksOverview.subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <select value={marksExamType} onChange={(event) => setMarksExamType(event.target.value as ExamType | 'All')} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                <option value="All">All exams</option>
                {MARK_EXAMS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
              </select>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {marksOverview.totalRecords} mark records - {marksOverview.averagePercent}% overall average
            </p>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Subject Performance">
              <ChartFrame>
                {marksOverview.subjectPerformance.length ? (
                  !useDesktopCharts ? (
                    <MobileVerticalBarChart data={marksOverview.subjectPerformance as unknown as Array<Record<string, string | number>>} labelKey="subject" valueKey="avg" />
                  ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                    <BarChart data={marksOverview.subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                      <Bar dataKey="avg" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={32} name="Avg Marks %" />
                    </BarChart>
                  </ResponsiveContainer>
                  )
                ) : (
                  <EmptyChart message="No marks found for this filter." />
                )}
              </ChartFrame>
            </ChartCard>
            <ChartCard title="Class Average">
              <ChartFrame>
                {marksOverview.classAverage.length ? (
                  !useDesktopCharts ? (
                    <MobileVerticalBarChart data={marksOverview.classAverage as unknown as Array<Record<string, string | number>>} labelKey="class" valueKey="avg" />
                  ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180} initialDimension={GOVERNING_CHART_INITIAL_DIMENSION}>
                    <LineChart data={marksOverview.classAverage}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                      <XAxis dataKey="class" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '14px', border: 'none' }} />
                      <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} name="Class Avg %" />
                    </LineChart>
                  </ResponsiveContainer>
                  )
                ) : (
                  <EmptyChart message="No class average data for this filter." />
                )}
              </ChartFrame>
            </ChartCard>
          </div>
        </div>
      )}

      <div className="pb-3 pt-1 text-center">
        <span className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
          <Shield size={12} /> Governing Body · Read-Only Executive Access
        </span>
      </div>
    </div>
  );
}
