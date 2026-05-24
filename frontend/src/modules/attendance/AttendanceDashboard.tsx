import { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, CalendarDays, CheckCircle2, XCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import {
  fetchAttendanceSheet,
  fetchStudentAttendanceSummary,
  upsertManualAttendance,
  type AttendanceSheetRow,
} from '../../services/attendance';
import { fetchStudentByProfile } from '../../services/schoolData';
import {
  getOldestEditableAttendanceDate,
  getTodayInputDate,
  isAttendanceDateEditable,
  isAttendanceDateFrozen,
  isFutureDateInput,
} from '../../utils/dateLimits';

const AttendanceDashboard = () => {
  const { user } = useAuthStore();
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const teacherOwnedClass = user?.role === 'Teacher' ? user?.class : undefined;
  const selectableClasses = user?.role === 'Teacher'
    ? (teacherOwnedClass ? [teacherOwnedClass] : [])
    : sections.map((section) => section.name);
  const [selectedClass, setSelectedClass] = useState(teacherOwnedClass || user?.class || '10-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceSheetRow[]>([]);
  const [studentSummary, setStudentSummary] = useState<{
    records: Array<{ attendance_date: string; status: 'Present' | 'Absent'; class_id: string }>;
    presentCount: number;
    absentCount: number;
    totalCount: number;
    attendanceRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.role === 'Teacher') {
      setSelectedClass(teacherOwnedClass || '');
    }
  }, [teacherOwnedClass, user?.role]);

  useEffect(() => {
    if (user?.role === 'Student' && user.id) {
      void (async () => {
        const student = await fetchStudentByProfile(user.id);
        if (student) {
          const summary = await fetchStudentAttendanceSummary(student.id);
          setStudentSummary(summary);
        }
      })();
      return;
    }

    if (user?.role === 'Teacher' && !teacherOwnedClass) {
      setAttendanceRows([]);
      return;
    }

    if (user?.role === 'Admin' || user?.role === 'Teacher') {
      setIsLoading(true);
      void fetchAttendanceSheet(selectedClass, attendanceDate)
        .then((rows) => setAttendanceRows(rows))
        .finally(() => setIsLoading(false));
    }
  }, [attendanceDate, selectedClass, teacherOwnedClass, user?.id, user?.role]);

  const handleMark = (id: string, status: 'Present' | 'Absent') => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can edit attendance for this class.');
      return;
    }

    if (teacherDateBlockedReason) {
      setNotice(teacherDateBlockedReason);
      return;
    }

    setAttendanceRows((current) =>
      current.map((student) => (student.id === id ? { ...student, attendanceStatus: status } : student))
    );
  };

  const handleBulk = (status: 'Present' | 'Absent') => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can edit attendance for this class.');
      return;
    }

    if (teacherDateBlockedReason) {
      setNotice(teacherDateBlockedReason);
      return;
    }

    setAttendanceRows((current) => current.map((student) => ({ ...student, attendanceStatus: status })));
  };

  const submitAttendance = async () => {
    if (user?.role === 'Teacher' && selectedClass !== teacherOwnedClass) {
      setNotice('Only the class teacher can submit attendance for this class.');
      return;
    }

    if (teacherDateBlockedReason) {
      setNotice(teacherDateBlockedReason);
      return;
    }

    setIsSaving(true);
    try {
      await upsertManualAttendance(selectedClass, attendanceDate, attendanceRows);
      setNotice(`Attendance saved for ${selectedClass} on ${attendanceDate}.`);
      setTimeout(() => setNotice(null), 2500);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      setNotice(error instanceof Error ? error.message : 'Could not save attendance. Please verify attendance permissions and selected class data.');
      setTimeout(() => setNotice(null), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = attendanceRows.filter((student) => student.attendanceStatus === 'Present').length;
  const absentCount = attendanceRows.filter((student) => student.attendanceStatus === 'Absent').length;
  const presentRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0;
  const teacherDateBlockedReason = user?.role === 'Teacher'
    ? isFutureDateInput(attendanceDate)
      ? 'Future attendance cannot be marked.'
      : isAttendanceDateFrozen(attendanceDate)
        ? 'Attendance is frozen after 2 days and can no longer be changed.'
        : null
    : null;
  const isTeacherEditLocked = user?.role === 'Teacher' && (
    selectedClass !== teacherOwnedClass || !isAttendanceDateEditable(attendanceDate)
  );

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlankDays = firstDay.getDay();
    const recordMap = new Map(
      (studentSummary?.records || []).map((record) => [record.attendance_date, record])
    );

    return [
      ...Array.from({ length: leadingBlankDays }, (_, index) => ({
        key: `blank-${index}`,
        dayNumber: null as number | null,
        dateKey: '',
        status: null as 'Present' | 'Absent' | null,
        isWeekend: false,
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const dayNumber = index + 1;
        const date = new Date(year, month, dayNumber);
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const record = recordMap.get(dateKey);

        return {
          key: dateKey,
          dayNumber,
          dateKey,
          status: record?.status || null,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
      }),
    ];
  }, [calendarMonth, studentSummary?.records]);

  const calendarMonthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  if (user?.role === 'Student') {
    return (
      <div className="erp-page h-full lg:pb-12">
        <div className="erp-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="erp-kicker">3. Attendance</p>
            <h1 className="erp-title">My Academic Presence</h1>
            <p className="erp-subtitle">Attendance summary from recorded entries.</p>
          </div>
          <div className="flex items-center gap-2 rounded border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            <TrendingUp size={16} /> {studentSummary?.attendanceRate || 0}% Attendance Rate
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Recorded Days" value={(studentSummary?.totalCount || 0).toString()} color="bg-[#4653a6]" icon={CalendarDays} />
          <StatCard title="Present Days" value={(studentSummary?.presentCount || 0).toString()} color="bg-emerald-500" icon={CheckCircle2} />
          <StatCard title="Absent Days" value={(studentSummary?.absentCount || 0).toString()} color="bg-rose-500" icon={XCircle} />
          <StatCard title="Current Class" value={user?.class || '-'} color="bg-blue-500" icon={Users} />
        </div>

        <div className="erp-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Monthly Attendance Calendar</h3>
              <p className="mt-1 text-sm text-slate-500">Marked Saturdays and Sundays use attendance colors; unmarked weekends stay muted.</p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => changeCalendarMonth(-1)}
                className="rounded p-2 text-slate-500 transition-colors hover:bg-white hover:text-blue-700"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="min-w-36 text-center text-sm font-bold text-slate-900">{calendarMonthLabel}</p>
              <button
                type="button"
                onClick={() => changeCalendarMonth(1)}
                className="rounded p-2 text-slate-500 transition-colors hover:bg-white hover:text-blue-700"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="p-3 lg:p-6">
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2 rounded bg-emerald-50 px-3 py-1.5 text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="inline-flex items-center gap-2 rounded bg-rose-50 px-3 py-1.5 text-rose-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="inline-flex items-center gap-2 rounded bg-white px-3 py-1.5 text-slate-500 ring-1 ring-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-white ring-1 ring-slate-300" /> Unmarked
              </span>
              <span className="inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Weekend
              </span>
            </div>

            <div className="grid grid-cols-7 overflow-hidden border border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-slate-50 px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const dayStateClass = !day.dayNumber
                  ? 'bg-slate-50/50'
                  : day.status === 'Present'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
                    : day.status === 'Absent'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100'
                      : day.isWeekend
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white text-slate-600';

                return (
                  <div
                    key={day.key}
                    className={`min-h-16 border-t border-slate-100 p-2 sm:min-h-24 ${(index + 1) % 7 === 0 ? '' : 'border-r'} ${dayStateClass}`}
                    title={day.status ? `${day.dateKey}: ${day.status}` : day.dayNumber ? `${day.dateKey}: Unmarked` : undefined}
                  >
                    {day.dayNumber && (
                      <div className="flex h-full flex-col justify-between">
                        <span className="text-sm font-bold sm:text-base">{day.dayNumber}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">
                          {day.status || (day.isWeekend ? 'Weekend' : '')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!studentSummary?.records.length && (
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm font-bold text-slate-500">
                No attendance records found yet.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="erp-page">
      <div className="erp-page-header flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:gap-4">
        <div>
          <p className="erp-kicker">3. Attendance</p>
          <h1 className="erp-title">Attendance</h1>
          <p className="erp-subtitle">Fast daily marking for your owned class.</p>
        </div>
      </div>

      {notice && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      {teacherDateBlockedReason && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {teacherDateBlockedReason} Teachers can update attendance only from {getOldestEditableAttendanceDate()} to {getTodayInputDate()}.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard title="Overall Present Today" value={`${presentRate}%`} icon={Users} color="bg-emerald-500" />
        <StatCard title="Absent Alert" value={`${absentCount} Students`} icon={AlertTriangle} color="bg-amber-500" />
        <StatCard title="Working Days Logged" value={attendanceRows.length.toString()} icon={CalendarDays} color="bg-blue-500" />
      </div>

      <div className="erp-table-wrap mb-12">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between lg:gap-4">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center lg:gap-4">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="erp-input min-w-0 bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 lg:px-4 lg:py-2 lg:font-medium"
            >
              {selectableClasses.map((className) => (
                <option key={className} value={className}>Class {className}</option>
              ))}
            </select>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              max={getTodayInputDate()}
              className="erp-input min-w-0 bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 lg:px-4 lg:py-2 lg:font-medium"
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button onClick={() => handleBulk('Present')} disabled={!!isTeacherEditLocked} className="flex-1 rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              Mark All Present
            </button>
            <button onClick={() => handleBulk('Absent')} disabled={!!isTeacherEditLocked} className="flex-1 rounded border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              Mark All Absent
            </button>
          </div>
        </div>

        <div className="max-h-[58dvh] space-y-2 overflow-y-auto p-3 md:hidden">
          {attendanceRows.map((student) => (
            <div key={student.id} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-sm font-semibold text-blue-700">
                  {student.rollNo}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{student.gender} - {student.contact}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleMark(student.id, 'Present')}
                  disabled={!!isTeacherEditLocked}
                  className={`inline-flex items-center justify-center gap-2 rounded px-3 py-3 text-sm font-semibold transition-colors ${
                    student.attendanceStatus === 'Present'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <CheckCircle2 size={17} /> Present
                </button>
                <button
                  onClick={() => handleMark(student.id, 'Absent')}
                  disabled={!!isTeacherEditLocked}
                  className={`inline-flex items-center justify-center gap-2 rounded px-3 py-3 text-sm font-semibold transition-colors ${
                    student.attendanceStatus === 'Absent'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <XCircle size={17} /> Absent
                </button>
              </div>
            </div>
          ))}
          {!isLoading && attendanceRows.length === 0 && (
            <div className="rounded border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm font-medium text-slate-500">
              No students found for the selected class.
            </div>
          )}
          {isLoading && <div className="px-4 py-6 text-sm font-medium text-slate-500">Loading attendance sheet...</div>}
        </div>

        <div className="hidden max-h-[420px] overflow-x-auto overflow-y-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 uppercase text-slate-500 text-xs font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-slate-100 w-24">Roll</th>
                <th className="px-4 py-3 border-b border-slate-100">Student</th>
                <th className="px-4 py-3 border-b border-slate-100 text-right w-48">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-slate-500 align-top">{student.rollNo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-[11px] font-semibold text-blue-700">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block leading-tight">{student.name}</span>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          {student.gender} · {student.contact}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleMark(student.id, 'Present')}
                        disabled={!!isTeacherEditLocked}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                          student.attendanceStatus === 'Present'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 size={14} className={student.attendanceStatus === 'Present' ? 'text-emerald-600' : ''} />
                        <span className="hidden sm:inline">Present</span>
                        <span className="sm:hidden">P</span>
                      </button>
                      <button
                        onClick={() => handleMark(student.id, 'Absent')}
                        disabled={!!isTeacherEditLocked}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                          student.attendanceStatus === 'Absent'
                            ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <XCircle size={14} className={student.attendanceStatus === 'Absent' ? 'text-rose-600' : ''} />
                        <span className="hidden sm:inline">Absent</span>
                        <span className="sm:hidden">A</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && attendanceRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-bold">No students found for the selected class.</td>
                </tr>
              )}
            </tbody>
          </table>
          {isLoading && <div className="px-6 py-4 text-sm font-medium text-slate-500">Loading attendance sheet...</div>}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex justify-end">
          <button onClick={() => void submitAttendance()} disabled={isSaving || isLoading || attendanceRows.length === 0 || !!isTeacherEditLocked} className="erp-primary-button w-full px-6 py-3 text-sm transition-colors disabled:opacity-60 sm:w-auto lg:py-2.5">
            {isSaving ? 'Saving...' : 'Submit Attendance Log'}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string; icon: typeof Users; color: string }) => (
  <div className="erp-card flex flex-col gap-2 p-3 transition-shadow hover:shadow-md md:flex-row md:items-center md:gap-4 md:p-5">
    <div className={`w-fit rounded p-2.5 md:p-4 ${color} shrink-0 text-white`}>
      <Icon size={18} className="md:hidden" />
      <Icon size={24} className="hidden md:block" />
    </div>
    <div>
      <h3 className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 md:text-sm md:font-medium md:normal-case md:tracking-normal">{title}</h3>
      <p className="mt-1 text-base font-bold text-slate-900 md:text-2xl">{value}</p>
    </div>
  </div>
);

export default AttendanceDashboard;
