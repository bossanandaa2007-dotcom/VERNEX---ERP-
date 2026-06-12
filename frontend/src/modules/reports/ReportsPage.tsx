import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle,
  Clock3,
  Download,
  GraduationCap,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import {
  fetchAttendanceMonthlyTrend,
  fetchAttendanceOverview,
  type AttendanceMonthlyPoint,
  type AttendanceOverview,
  type AttendanceOverviewRange,
} from '../../services/attendance';
import {
  fetchGoverningMarksOverview,
  MARK_EXAMS,
  type ExamType,
  type GoverningMarksOverview,
} from '../../services/marks';

const emptyAttendanceOverview: AttendanceOverview = {
  trend: [],
  classBreakdown: [],
  liveRegistry: [],
  totalRecords: 0,
  presentCount: 0,
  absentCount: 0,
  attendanceRate: 0,
};

const emptyMarksOverview: GoverningMarksOverview = {
  groups: [],
  sections: [],
  subjects: [],
  subjectPerformance: [],
  classAverage: [],
  totalRecords: 0,
  averagePercent: 0,
};

const ATTENDANCE_RANGES: Array<{ value: AttendanceOverviewRange; label: string }> = [
  { value: 'overall', label: 'Overall' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'twoMonthsAgo', label: 'Previous Month' },
];

const PIE_COLORS = ['#0f766e', '#e11d48'];

const clampPercent = (value: number) => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);

const MobileReportBars = ({ data, labelKey, valueKey, color = '#4f46e5' }: { data: Array<Record<string, string | number>>; labelKey: string; valueKey: string; color?: string }) => (
  <div className="flex h-full min-h-[230px] items-end gap-2 overflow-x-auto px-1 pb-2 pt-4">
    {data.map((row, index) => {
      const label = String(row[labelKey]);
      const rawValue = Number(row[valueKey]);
      const maxValue = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1);
      const height = Math.max(4, (rawValue / maxValue) * 100);
      return (
        <div key={`${label}-${index}`} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
          <div className="flex h-36 w-full items-end rounded bg-slate-50">
            <div className="w-full rounded-t" style={{ height: `${height}%`, backgroundColor: color }} />
          </div>
          <span className="max-w-16 truncate text-[10px] font-semibold text-slate-500">{label}</span>
        </div>
      );
    })}
  </div>
);

const MobileReportTrend = ({ data }: { data: Array<{ day: string; present: number; absent: number }> }) => {
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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[230px] w-full" role="img" aria-label="Daily attendance rate">
      {[0, 50, 100].map((tick) => {
        const y = padding.top + plotHeight - (tick / 100) * plotHeight;
        return (
          <g key={tick}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px] font-semibold">{tick}</text>
          </g>
        );
      })}
      <path d={toPath(presentPoints)} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
      <path d={toPath(absentPoints)} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
      {presentPoints.map((point, index) => <circle key={`p-${point.label}-${index}`} cx={point.x} cy={point.y} r="3" fill="#0f766e" />)}
      {absentPoints.map((point, index) => <circle key={`a-${point.label}-${index}`} cx={point.x} cy={point.y} r="3" fill="#e11d48" />)}
      {presentPoints.map((point, index) => (
        <text key={`${point.label}-label-${index}`} x={point.x} y={height - 26} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">
          {data.length <= 5 || index % 2 === 0 ? point.label : ''}
        </text>
      ))}
    </svg>
  );
};

const MobileReportDonut = ({ data }: { data: Array<{ name: string; value: number }> }) => {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const present = data.find((point) => point.name === 'Present')?.value || 0;
  const presentPct = total ? Math.round((present / total) * 100) : 0;
  return (
    <div className="flex h-full min-h-[230px] flex-col items-center justify-center gap-4">
      <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#0f766e 0 ${presentPct}%, #e11d48 ${presentPct}% 100%)` }}>
        <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">{presentPct}%</div>
      </div>
      <div className="flex gap-4 text-xs font-semibold">
        {data.map((point, index) => <span key={point.name} className={index === 0 ? 'text-teal-700' : 'text-rose-600'}>{point.name}: {point.value}</span>)}
      </div>
    </div>
  );
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatAttendanceRangeLabel = (range: AttendanceOverviewRange) =>
  ATTENDANCE_RANGES.find((option) => option.value === range)?.label || 'Custom';

const getAutoTableEndY = (document: jsPDF) => {
  const tableDocument = document as jsPDF & { lastAutoTable?: { finalY?: number } };
  return tableDocument.lastAutoTable?.finalY ?? 58;
};

const ReportsPage = () => {
  const { user } = useAuthStore();
  const initialize = useClassStore((state) => state.initialize);
  const students = useClassStore((state) => state.students);
  const sections = useClassStore((state) => state.sections);
  const teachers = useClassStore((state) => state.teachers);
  const categories = useClassStore((state) => state.categories);

  const [notification, setNotification] = useState<string | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<AttendanceOverviewRange>('month');
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverview>(emptyAttendanceOverview);
  const [monthlyTrend, setMonthlyTrend] = useState<AttendanceMonthlyPoint[]>([]);
  const [marksOverview, setMarksOverview] = useState<GoverningMarksOverview>(emptyMarksOverview);
  const [marksGroupId, setMarksGroupId] = useState('All');
  const [marksSectionId, setMarksSectionId] = useState('All');
  const [marksSubject, setMarksSubject] = useState('All');
  const [marksExamType, setMarksExamType] = useState<ExamType | 'All'>('All');
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [marksError, setMarksError] = useState<string | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [isMarksLoading, setIsMarksLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [useDesktopCharts, setUseDesktopCharts] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setUseDesktopCharts(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAttendance = async () => {
      try {
        setIsAttendanceLoading(true);
        setAttendanceError(null);

        const days = attendanceRange === 'today' ? 1 : attendanceRange === 'week' ? 7 : attendanceRange === 'month' ? 30 : attendanceRange === 'overall' ? 0 : 60;

        const [overview, trend] = await Promise.all([
          fetchAttendanceOverview(days, attendanceRange),
          fetchAttendanceMonthlyTrend(6),
        ]);

        if (cancelled) {
          return;
        }

        setAttendanceOverview(overview);
        setMonthlyTrend(trend);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error('Failed to load admin attendance reports:', error);
        if (!cancelled) {
          setAttendanceOverview(emptyAttendanceOverview);
          setMonthlyTrend([]);
          setAttendanceError(error instanceof Error ? error.message : 'Unable to load attendance reports.');
        }
      } finally {
        if (!cancelled) {
          setIsAttendanceLoading(false);
        }
      }
    };

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [attendanceRange]);

  useEffect(() => {
    let cancelled = false;

    const loadMarks = async () => {
      try {
        setIsMarksLoading(true);
        setMarksError(null);

        const overview = await fetchGoverningMarksOverview({
          groupId: marksGroupId,
          sectionId: marksSectionId,
          subject: marksSubject,
          examType: marksExamType,
        });

        if (cancelled) {
          return;
        }

        setMarksOverview(overview);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error('Failed to load admin marks reports:', error);
        if (!cancelled) {
          setMarksOverview(emptyMarksOverview);
          setMarksError(error instanceof Error ? error.message : 'Unable to load marks reports.');
        }
      } finally {
        if (!cancelled) {
          setIsMarksLoading(false);
        }
      }
    };

    void loadMarks();

    return () => {
      cancelled = true;
    };
  }, [marksGroupId, marksSectionId, marksSubject, marksExamType]);

  const sectionLookup = useMemo(
    () => new Map(sections.map((section) => [section.id, section.name])),
    [sections]
  );

  const marksSections = useMemo(
    () => marksOverview.sections.filter((section) => marksGroupId === 'All' || section.groupId === marksGroupId),
    [marksOverview.sections, marksGroupId]
  );

  const attendanceClassData = useMemo(
    () => attendanceOverview.classBreakdown
      .map((row) => ({
        class: sectionLookup.get(row.classId) || row.classId,
        pct: row.pct,
        total: row.total,
        presentCount: row.presentCount,
      }))
      .sort((left, right) => right.pct - left.pct || right.total - left.total)
      .slice(0, 8),
    [attendanceOverview.classBreakdown, sectionLookup]
  );

  const attendanceTrendData = useMemo(
    () => {
      if (attendanceRange === 'overall') {
        // Only show months for the current year (Jan -> current month)
        const currentYear = new Date().getFullYear();
        const currentMonthIndex = new Date().getMonth(); // 0-based
        const monthsMap = new Map<string, { presentCount: number; absentCount: number; total: number }>();

        // initialize months for current year to preserve order and include zeros
        for (let m = 0; m <= currentMonthIndex; m += 1) {
          const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`; // YYYY-MM
          monthsMap.set(key, { presentCount: 0, absentCount: 0, total: 0 });
        }

        // accumulate only records in the current year
        attendanceOverview.trend.forEach((row) => {
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

        return entries;
      }

      return attendanceOverview.trend.map((row) => ({
        day: row.label,
        present: row.present,
        absent: row.absent,
        total: row.total,
      }));
    },
    [attendanceOverview.trend, attendanceRange]
  );

  const pieData = useMemo(
    () => [
      { name: 'Present', value: attendanceOverview.presentCount },
      { name: 'Absent', value: attendanceOverview.absentCount },
    ],
    [attendanceOverview.presentCount, attendanceOverview.absentCount]
  );

  const topSubjects = useMemo(
    () => [...marksOverview.subjectPerformance]
      .sort((left, right) => right.avg - left.avg || right.records - left.records)
      .slice(0, 5),
    [marksOverview.subjectPerformance]
  );

  const attentionSubjects = useMemo(
    () => [...marksOverview.subjectPerformance]
      .sort((left, right) => left.avg - right.avg || right.records - left.records)
      .slice(0, 5),
    [marksOverview.subjectPerformance]
  );

  const topClasses = useMemo(
    () => [...marksOverview.classAverage]
      .sort((left, right) => right.avg - left.avg || right.records - left.records)
      .slice(0, 6),
    [marksOverview.classAverage]
  );

  const attendanceGrowthText = useMemo(() => {
    if (monthlyTrend.length < 2) {
      return 'Monthly comparison unavailable';
    }

    const previous = monthlyTrend[monthlyTrend.length - 2]?.attendanceRate || 0;
    const current = monthlyTrend[monthlyTrend.length - 1]?.attendanceRate || 0;
    const delta = current - previous;

    return `${delta >= 0 ? '+' : ''}${delta}% vs previous month`;
  }, [monthlyTrend]);

  const keyStats = useMemo(
    () => [
      {
        title: 'Students',
        value: students.length,
        detail: 'Active student profiles',
        icon: GraduationCap,
        tone: 'bg-teal-50 text-teal-700',
      },
      {
        title: 'Faculty',
        value: teachers.length,
        detail: 'Mapped teaching staff',
        icon: Users,
        tone: 'bg-sky-50 text-sky-700',
      },
      {
        title: 'Attendance Rate',
        value: `${attendanceOverview.attendanceRate}%`,
        detail: `${formatAttendanceRangeLabel(attendanceRange)} live attendance`,
        icon: Activity,
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        title: 'Marks Average',
        value: `${marksOverview.averagePercent}%`,
        detail: `${marksOverview.totalRecords} marks records`,
        icon: BookOpen,
        tone: 'bg-indigo-50 text-indigo-700',
      },
    ],
    [students.length, teachers.length, attendanceOverview.attendanceRate, attendanceRange, marksOverview.averagePercent, marksOverview.totalRecords]
  );

  const handleExportAll = () => {
    const generatedAt = new Date();
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('VerneX ERP - Admin Institutional Report', 14, 17);
    doc.setFontSize(10);
    doc.text(`Generated for ${user?.name || 'Admin'} on ${formatDateTime(generatedAt)}`, 14, 24);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(`Attendance window: ${formatAttendanceRangeLabel(attendanceRange)}`, 14, 40);
    doc.text(`Marks filters: ${marksGroupId} / ${marksSectionId} / ${marksSubject} / ${marksExamType}`, 14, 46);
    doc.text(`Students: ${students.length}`, 190, 40);
    doc.text(`Sections: ${sections.length}`, 190, 46);
    doc.text(`Faculty: ${teachers.length}`, 190, 52);

    autoTable(doc, {
      startY: 58,
      head: [['Metric', 'Value', 'Source']],
      body: [
        ['Attendance rate', `${attendanceOverview.attendanceRate}%`, formatAttendanceRangeLabel(attendanceRange)],
        ['Present entries', String(attendanceOverview.presentCount), 'attendance_records'],
        ['Absent entries', String(attendanceOverview.absentCount), 'attendance_records'],
        ['Attendance records', String(attendanceOverview.totalRecords), 'attendance_records'],
        ['Marks average', `${marksOverview.averagePercent}%`, 'student_marks'],
        ['Mark records', String(marksOverview.totalRecords), 'student_marks'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    autoTable(doc, {
      startY: getAutoTableEndY(doc) + 8,
      head: [['Month', 'Attendance Records', 'Attendance Rate']],
      body: monthlyTrend.length
        ? monthlyTrend.map((row) => [row.month, String(row.records), `${row.attendanceRate}%`])
        : [['No attendance trend data', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
    });

    autoTable(doc, {
      startY: getAutoTableEndY(doc) + 8,
      head: [['Top Subject', 'Average %', 'Records']],
      body: topSubjects.length
        ? topSubjects.map((row) => [row.subject, `${row.avg}%`, String(row.records)])
        : [['No subject data', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      alternateRowStyles: { fillColor: [238, 242, 255] },
    });

    autoTable(doc, {
      startY: getAutoTableEndY(doc) + 8,
      head: [['Recent Attendance Log', 'Class', 'Status', 'Date']],
      body: attendanceOverview.liveRegistry.length
        ? attendanceOverview.liveRegistry.map((row) => [
            row.studentName,
            sectionLookup.get(row.classId) || row.classId,
            row.status,
            row.attendanceDate,
          ])
        : [['No live attendance records', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.8 },
      alternateRowStyles: { fillColor: [240, 249, 255] },
    });

    doc.save('admin_institutional_report.pdf');
    setNotification('Admin institutional report downloaded successfully.');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-w-0 space-y-5 pb-8 lg:pb-12">
      <section className="border border-slate-200 bg-white px-5 py-4 shadow-sm lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              <ShieldCheck size={12} /> Admin Reporting Center
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Reports & Analytics</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Attendance, class performance, subject trends, and recent reporting activity are shown here from live records only.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last Refresh</p>
              <p className="mt-1 font-semibold">{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'Waiting for live data'}</p>
            </div>
            <button
              onClick={handleExportAll}
              className="inline-flex items-center justify-center gap-2 rounded bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </div>
      </section>

      {notification && (
        <div className="fixed right-6 top-20 z-50">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-xl">
            <CheckCircle size={18} className="text-emerald-600" />
            <p className="text-sm font-semibold text-slate-800">{notification}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {keyStats.map((stat) => (
          <article key={stat.title} className="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{stat.title}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{stat.detail}</p>
              </div>
              <div className={`rounded-2xl p-3 ${stat.tone}`}>
                <stat.icon size={22} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Attendance records by month</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Six-month record volume with real month-wise attendance rates.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">
                <TrendingUp size={14} /> {attendanceGrowthText}
              </div>
              <select
                value={attendanceRange}
                onChange={(event) => setAttendanceRange(event.target.value as AttendanceOverviewRange)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white"
              >
                {ATTENDANCE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 h-[260px] overflow-hidden sm:h-[320px]">
            {isAttendanceLoading ? (
              <PanelState message="Loading live attendance reports..." />
            ) : attendanceError ? (
              <PanelState message={attendanceError} tone="error" />
            ) : monthlyTrend.length ? (
              !useDesktopCharts ? (
                <MobileReportBars data={monthlyTrend as unknown as Array<Record<string, string | number>>} labelKey="month" valueKey="records" />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 18px 45px rgba(15,23,42,0.12)' }}
                  />
                  <Bar dataKey="records" fill="#4f46e5" radius={[10, 10, 0, 0]} barSize={42} name="Attendance Records" />
                </BarChart>
              </ResponsiveContainer>
              )
            ) : (
              <PanelState message="No attendance records found for the monthly report." />
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Live Summary</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Operational snapshot</h2>
            </div>
            <Clock3 size={18} className="text-slate-400" />
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: 'Attendance rate', value: `${attendanceOverview.attendanceRate}%`, meta: formatAttendanceRangeLabel(attendanceRange) },
              { label: 'Present entries', value: String(attendanceOverview.presentCount), meta: 'attendance_records' },
              { label: 'Absent entries', value: String(attendanceOverview.absentCount), meta: 'attendance_records' },
              { label: 'Total logs', value: String(attendanceOverview.totalRecords), meta: 'attendance_records' },
              { label: 'Subjects covered', value: String(marksOverview.subjectPerformance.length), meta: 'current marks filter' },
              { label: 'Sections covered', value: String(sections.length), meta: 'school structure' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3.5">
                <div>
                  <p className="text-sm font-black text-slate-900">{item.label}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{item.meta}</p>
                </div>
                <span className="text-lg font-black text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Data integrity</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              This report page shows live data from student, section, attendance, and marks records only. No static demo metrics are rendered.
            </p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Trendline</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Daily attendance rate</h2>
            </div>
            <BarChart3 size={18} className="text-slate-400" />
          </div>

          <div className="mt-6 h-[260px] overflow-hidden sm:h-[300px]">
            {isAttendanceLoading ? (
              <PanelState message="Loading live trend..." />
            ) : attendanceError ? (
              <PanelState message={attendanceError} tone="error" />
            ) : attendanceTrendData.length ? (
              !useDesktopCharts ? (
                <MobileReportTrend data={attendanceTrendData} />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 18px 45px rgba(15,23,42,0.12)' }} />
                  <Line type="monotone" dataKey="present" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} name="Present %" />
                  <Line type="monotone" dataKey="absent" stroke="#e11d48" strokeWidth={3} dot={{ r: 4 }} name="Absent %" />
                </LineChart>
              </ResponsiveContainer>
              )
            ) : (
              <PanelState message="No attendance trend found for the selected window." />
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Distribution</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Present vs absent</h2>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>

          <div className="mt-6 h-[260px] overflow-hidden sm:h-[300px]">
            {isAttendanceLoading ? (
              <PanelState message="Loading attendance distribution..." />
            ) : attendanceError ? (
              <PanelState message={attendanceError} tone="error" />
            ) : pieData.some((item) => item.value > 0) ? (
              !useDesktopCharts ? (
                <MobileReportDonut data={pieData} />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 18px 45px rgba(15,23,42,0.12)' }} />
                </PieChart>
              </ResponsiveContainer>
              )
            ) : (
              <PanelState message="No present or absent logs found for this range." />
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Academic Analytics</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Marks performance overview</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Filter by subject group, section, subject, and exam using live marks data.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={marksGroupId}
              onChange={(event) => {
                setMarksGroupId(event.target.value);
                setMarksSectionId('All');
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white"
            >
              <option value="All">All subject groups</option>
              {marksOverview.groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <select
              value={marksSectionId}
              onChange={(event) => setMarksSectionId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white"
            >
              <option value="All">All sections</option>
              {marksSections.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
            <select
              value={marksSubject}
              onChange={(event) => setMarksSubject(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white"
            >
              <option value="All">All subjects</option>
              {marksOverview.subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select
              value={marksExamType}
              onChange={(event) => setMarksExamType(event.target.value as ExamType | 'All')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:bg-white"
            >
              <option value="All">All exams</option>
              {MARK_EXAMS.map((exam) => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricBlock label="Overall marks average" value={`${marksOverview.averagePercent}%`} meta="Filtered student_marks records" />
          <MetricBlock label="Total mark records" value={String(marksOverview.totalRecords)} meta="Rows included in this report" />
          <MetricBlock label="Academic coverage" value={`${marksOverview.subjectPerformance.length} subjects`} meta={`${categories.length} grade levels configured`} />
        </div>
        {marksError && (
          <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {marksError}
          </div>
        )}
      </section>

      {/* Subject and Class charts removed as requested */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Class Ranking</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Best attendance classes</h2>
            </div>
            <TrendingUp size={18} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {isAttendanceLoading ? (
              <PanelState message="Loading class attendance..." compact />
            ) : attendanceClassData.length ? (
              attendanceClassData.map((row, index) => (
                <ListRow
                  key={row.class}
                  index={index + 1}
                  title={row.class}
                  subtitle={`${row.presentCount} present from ${row.total} records`}
                  value={`${row.pct}%`}
                  accent="emerald"
                />
              ))
            ) : (
              <PanelState message="No class attendance records found." compact />
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Academic Leaders</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Top subjects</h2>
            </div>
            <TrendingUp size={18} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {isMarksLoading ? (
              <PanelState message="Loading top subjects..." compact />
            ) : topSubjects.length ? (
              topSubjects.map((row, index) => (
                <ListRow
                  key={row.subject}
                  index={index + 1}
                  title={row.subject}
                  subtitle={`${row.records} records`}
                  value={`${row.avg}%`}
                  accent="indigo"
                />
              ))
            ) : (
              <PanelState message="No subject performance data found." compact />
            )}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Needs Attention</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Lowest subjects</h2>
            </div>
            <TrendingDown size={18} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {isMarksLoading ? (
              <PanelState message="Loading attention areas..." compact />
            ) : attentionSubjects.length ? (
              attentionSubjects.map((row, index) => (
                <ListRow
                  key={row.subject}
                  index={index + 1}
                  title={row.subject}
                  subtitle={`${row.records} records`}
                  value={`${row.avg}%`}
                  accent="rose"
                />
              ))
            ) : (
              <PanelState message="No subject performance data found." compact />
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
        <section className="rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Top Classes</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Best academic averages</h2>
            </div>
            <BookOpen size={18} className="text-slate-400" />
          </div>

          <div className="mt-5 space-y-3">
            {isMarksLoading ? (
              <PanelState message="Loading class ranking..." compact />
            ) : topClasses.length ? (
              topClasses.map((row, index) => (
                <ListRow
                  key={row.class}
                  index={index + 1}
                  title={row.class}
                  subtitle={`${row.records} records`}
                  value={`${row.avg}%`}
                  accent="violet"
                />
              ))
            ) : (
              <PanelState message="No class average data found." compact />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const PanelState = ({
  message,
  tone = 'neutral',
  compact = false,
}: {
  message: string;
  tone?: 'neutral' | 'error';
  compact?: boolean;
}) => (
  <div className={`flex h-full items-center justify-center rounded-[1.4rem] border border-dashed px-5 text-center ${
    compact ? 'min-h-[120px]' : 'min-h-[220px]'
  } ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
    <p className="text-sm font-semibold leading-6">{message}</p>
  </div>
);

const MetricBlock = ({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) => (
  <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50 px-4 py-4">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
    <p className="mt-2 text-sm font-semibold text-slate-500">{meta}</p>
  </div>
);

const ListRow = ({
  index,
  title,
  subtitle,
  value,
  accent,
}: {
  index: number;
  title: string;
  subtitle: string;
  value: string;
  accent: 'emerald' | 'indigo' | 'rose' | 'violet';
}) => {
  const accentClass = {
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  }[accent];

  return (
    <div className="flex items-center gap-3 rounded-[1.3rem] border border-slate-100 px-4 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${accentClass}`}>
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
      </div>
      <span className="text-sm font-black text-slate-800">{value}</span>
    </div>
  );
};

export default ReportsPage;
