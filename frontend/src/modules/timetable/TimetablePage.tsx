import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import {
  deleteTimetableEntry,
  fetchStudentTimetableEntries,
  fetchTimetableEntries,
  saveTimetableEntry,
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  type TimetableEntry,
} from '../../services/timetable';
import type { ISection } from '../../types/school';

const entryKey = (dayOfWeek: number, periodNumber: number) => `${dayOfWeek}:${periodNumber}`;

const byNaturalName = <T extends { name: string }>(left: T, right: T) =>
  left.name.localeCompare(right.name, undefined, { numeric: true });

const TimetablePage = () => {
  const user = useAuthStore((state) => state.user);
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const curriculumGroups = useClassStore((state) => state.curriculumGroups);
  const isClassDataLoading = useClassStore((state) => state.isLoading);

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const today = new Date().getDay();

  const isAdmin = user?.role === 'Admin';
  const isTeacher = user?.role === 'Teacher';
  const isStudent = user?.role === 'Student';

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const sortedSections = useMemo(
    () => sections.slice().sort(byNaturalName),
    [sections]
  );

  useEffect(() => {
    if (!isAdmin || selectedSectionId || !sortedSections.length) {
      return;
    }

    setSelectedSectionId(sortedSections[0].id);
  }, [isAdmin, selectedSectionId, sortedSections]);

  const activeSection = useMemo<ISection | null>(() => {
    if (isAdmin) {
      return sortedSections.find((section) => section.id === selectedSectionId) || null;
    }

    if (isStudent) {
      return sortedSections.find((section) => section.name === user?.class) || null;
    }

    return null;
  }, [isAdmin, isStudent, selectedSectionId, sortedSections, user?.class]);

  const subjectOptions = useMemo(() => {
    if (!activeSection) {
      return [];
    }

    const group = curriculumGroups.find((item) => item.sectionNames.includes(activeSection.name));
    return group?.subjects.map((subject) => subject.name) || [];
  }, [activeSection, curriculumGroups]);

  const entriesByCell = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    entries.forEach((entry) => {
      map.set(entryKey(entry.dayOfWeek, entry.periodNumber), entry);
    });
    return map;
  }, [entries]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (isAdmin && !selectedSectionId) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const request = isAdmin
      ? fetchTimetableEntries({ sectionId: selectedSectionId })
      : isTeacher
        ? fetchTimetableEntries({ teacherProfileId: user.id })
        : fetchStudentTimetableEntries(user.id);

    void request
      .then(setEntries)
      .catch((error) => setMessage(error?.message || 'Failed to load timetable.'))
      .finally(() => setIsLoading(false));
  }, [isAdmin, isTeacher, selectedSectionId, user?.id]);

  const resolveTeacherForSubject = (section: ISection, subject: string) =>
    (section.subjectTeachers || []).find(
      (teacher) => teacher.subject.toLowerCase() === subject.toLowerCase()
    );

  const refreshActiveTimetable = async () => {
    if (isAdmin && selectedSectionId) {
      setEntries(await fetchTimetableEntries({ sectionId: selectedSectionId }));
      return;
    }

    if (isTeacher && user?.id) {
      setEntries(await fetchTimetableEntries({ teacherProfileId: user.id }));
      return;
    }

    if (isStudent && user?.id) {
      setEntries(await fetchStudentTimetableEntries(user.id));
    }
  };

  const handleSubjectChange = async (dayOfWeek: number, periodNumber: number, subject: string) => {
    if (!activeSection) {
      return;
    }

    const existing = entriesByCell.get(entryKey(dayOfWeek, periodNumber));
    setMessage(null);

    try {
      if (!subject) {
        if (existing) {
          await deleteTimetableEntry(existing.id);
          setMessage('Period cleared.');
          await refreshActiveTimetable();
        }
        return;
      }

      const teacher = resolveTeacherForSubject(activeSection, subject);
      if (!teacher) {
        setMessage(`Assign a teacher for ${subject} in ${activeSection.name} before adding it to the timetable.`);
        return;
      }

      await saveTimetableEntry({
        sectionId: activeSection.id,
        teacherId: teacher.id,
        subject,
        dayOfWeek,
        periodNumber,
      });
      setMessage('Timetable updated.');
      await refreshActiveTimetable();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to update this period.');
    }
  };

  const renderReadOnlyGrid = () => (
    <div className="erp-table-wrap hidden overflow-x-auto md:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-28 px-5 py-4">Day</th>
            {TIMETABLE_PERIODS.map((period) => (
              <th key={period} className="px-4 py-4">P{period}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMETABLE_DAYS.map((day) => {
            const isToday = day.value === today;

            return (
              <tr key={day.value} className={`border-t border-slate-100 ${isToday ? 'bg-blue-50/70' : ''}`}>
                <td className={`px-5 py-4 font-bold ${isToday ? 'bg-blue-100/80 text-blue-700' : 'bg-slate-50/60 text-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    <span>{day.label}</span>
                    {isToday && (
                      <span className="rounded bg-blue-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Today
                      </span>
                    )}
                  </div>
                </td>
                {TIMETABLE_PERIODS.map((period) => {
                  const entry = entriesByCell.get(entryKey(day.value, period));
                  return (
                    <td key={period} className="min-w-36 px-4 py-4 align-top">
                      {entry ? (
                        <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-sm font-bold text-slate-900">{entry.subject}</p>
                          <p className="mt-1 text-xs font-medium text-blue-700">{entry.sectionName}</p>
                          <p className="mt-1 text-xs text-slate-500">{entry.teacherName}</p>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-300">Free</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderReadOnlyCards = () => (
    <div className="space-y-3 pb-2 md:hidden">
      <div className="erp-card p-4">
        <label className="erp-section-label mb-2 block">Choose Day</label>
        <select
          value={selectedDay}
          onChange={(event) => setSelectedDay(Number(event.target.value))}
          className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-400"
        >
          {TIMETABLE_DAYS.map((day) => (
            <option key={day.value} value={day.value}>{day.label}</option>
          ))}
        </select>
      </div>

      {TIMETABLE_DAYS.filter((day) => day.value === selectedDay).map((day) => {
        const dayEntries = entries
          .filter((entry) => entry.dayOfWeek === day.value)
          .sort((left, right) => left.periodNumber - right.periodNumber);

        return (
          <section key={day.value} className={`border p-4 shadow-sm ${day.value === today ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{day.label}</h2>
                {day.value === today && (
                  <span className="rounded bg-blue-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Today
                  </span>
                )}
              </div>
              <span className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${day.value === today ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {dayEntries.length} periods
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {dayEntries.length ? dayEntries.map((entry) => (
                <div key={entry.id} className="rounded border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900">{entry.subject}</p>
                      <p className="mt-1 text-xs font-bold text-blue-700">{entry.sectionName}</p>
                    </div>
                    <span className="shrink-0 rounded bg-white px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      P{entry.periodNumber}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs font-medium text-slate-500">{entry.teacherName}</p>
                </div>
              )) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-400">No scheduled periods.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="erp-page">
      <div className="erp-page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="erp-kicker">{isAdmin ? 'Class Timetable Builder' : isTeacher ? '2. My Teaching Timetable' : 'Timetable'}</p>
          <h1 className="erp-title">
            {isAdmin ? 'Class Timetable Builder' : isTeacher ? 'My Teaching Timetable' : 'My Class Timetable'}
          </h1>
          <p className="erp-subtitle max-w-2xl">
            {isAdmin
              ? 'Each period accepts only subjects configured for the selected section. The matching teacher is resolved from the section staffing map.'
              : 'This view is scoped by your login and reflects the timetable published by admin.'}
          </p>
        </div>

        {isAdmin && (
          <div className="w-full max-w-xs">
            <label className="erp-section-label mb-2 block">Select Section</label>
            <select
              value={selectedSectionId}
              onChange={(event) => setSelectedSectionId(event.target.value)}
              className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
            >
              {sortedSections.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {message && (
        <div className="flex items-center gap-3 rounded border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-800">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {(isLoading || isClassDataLoading) && (
        <div className="erp-card px-5 py-4 text-sm font-medium text-slate-500">
          Loading timetable...
        </div>
      )}

      {isAdmin && activeSection && (
        <div className="erp-card p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="erp-section-label">Editing Section</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{activeSection.name}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((subject) => (
                <span key={subject} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                  {subject}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-28 px-5 py-4">Day</th>
                  {TIMETABLE_PERIODS.map((period) => (
                    <th key={period} className="px-3 py-4">Period {period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMETABLE_DAYS.map((day) => {
                  const isToday = day.value === today;

                  return (
                    <tr key={day.value} className={`border-t border-slate-100 ${isToday ? 'bg-blue-50/70' : ''}`}>
                      <td className={`px-5 py-4 font-bold ${isToday ? 'bg-blue-100/80 text-blue-700' : 'bg-slate-50/60 text-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <span>{day.label}</span>
                          {isToday && (
                              <span className="rounded bg-blue-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      {TIMETABLE_PERIODS.map((period) => {
                        const entry = entriesByCell.get(entryKey(day.value, period));
                        const teacher = entry ? resolveTeacherForSubject(activeSection, entry.subject) : null;

                        return (
                          <td key={period} className="min-w-36 px-3 py-4 align-top">
                            <div className="space-y-2">
                              <select
                                value={entry?.subject || ''}
                                onChange={(event) => void handleSubjectChange(day.value, period, event.target.value)}
                                className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-400"
                              >
                                <option value="">Free</option>
                                {subjectOptions.map((subject) => (
                                  <option key={subject} value={subject}>{subject}</option>
                                ))}
                              </select>
                              <div className="min-h-10 rounded bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
                                {entry ? teacher?.name || entry.teacherName : 'No teacher assigned'}
                              </div>
                              {entry && (
                                <button
                                  onClick={() => void handleSubjectChange(day.value, period, '')}
                                  className="inline-flex items-center gap-1 rounded bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-500 hover:bg-rose-100"
                                >
                                  <Trash2 size={12} /> Clear
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="erp-card p-4 lg:p-5">
              <CalendarDays className="text-blue-600" size={24} />
              <p className="erp-section-label mt-3">Scheduled Periods</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{entries.length}</p>
            </div>
            <div className="erp-card p-4 md:col-span-2 lg:p-5">
              <Clock className="text-emerald-500" size={24} />
              <p className="erp-section-label mt-3">Scope</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {isTeacher ? 'Periods assigned to your teacher profile' : activeSection?.name || user?.class || 'Student section'}
              </p>
            </div>
          </div>
          {renderReadOnlyCards()}
          {renderReadOnlyGrid()}
        </>
      )}
    </div>
  );
};

export default TimetablePage;
