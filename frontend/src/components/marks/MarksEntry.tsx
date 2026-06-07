import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle, Filter, Lock, Search, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  fetchTeacherStudentPerformance,
  MARK_EXAMS,
  upsertStudentMark,
  type ExamType,
  type TeacherStudentPerformanceRow,
  type TeacherStudentSubjectPerformance,
} from '../../services/marks';

const scoreColor = (marks?: number | null) => {
  if (typeof marks !== 'number') return 'text-slate-400';
  if (marks >= 75) return 'text-emerald-600';
  if (marks >= 40) return 'text-indigo-600';
  return 'text-rose-600';
};

const MarksEntry = () => {
  const { user } = useAuthStore();
  const [examType, setExamType] = useState<ExamType>('Quarterly');
  const [rows, setRows] = useState<TeacherStudentPerformanceRow[]>([]);
  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.role !== 'Teacher' || !user.id) {
      return;
    }

    setLoading(true);
    void fetchTeacherStudentPerformance(user.id, examType)
      .then((items) => {
        setRows(items);
        setDraftMarks({});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examType, user?.id, user?.role]);

  const classOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.className))).sort(),
    [rows]
  );

  const subjectOptions = useMemo(
    () => Array.from(new Set(rows.flatMap((row) => row.subjects.map((subject) => subject.subject)))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesClass = classFilter === 'All' || row.className === classFilter;
      const matchesSubject = subjectFilter === 'All' || row.subjects.some((subject) => subject.subject === subjectFilter);
      const matchesSearch = !normalizedSearch ||
        row.studentName.toLowerCase().includes(normalizedSearch) ||
        String(row.rollNo || '').toLowerCase().includes(normalizedSearch);

      return matchesClass && matchesSubject && matchesSearch;
    });
  }, [classFilter, rows, search, subjectFilter]);

  const visibleSubjectMarks = useMemo(
    () => filteredRows.flatMap((row) => row.subjects),
    [filteredRows]
  );

  const completedMarks = visibleSubjectMarks.filter((subject) => typeof subject.marks === 'number');
  const editableSubjects = visibleSubjectMarks.filter((subject) => subject.canEdit).length;
  const lockedClassNames = useMemo(
    () => Array.from(new Set(rows
      .filter((row) => row.subjects.some((subject) => subject.isLocked))
      .map((row) => row.className)
    )).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [rows]
  );

  const subjectHighestCards = useMemo(() => {
    const cards = new Map<string, { subject: string; highestMarks: number | null; savedMarks: number; totalMarks: number }>();

    filteredRows.forEach((row) => {
      row.subjects.forEach((subject) => {
        if (subjectFilter !== 'All' && subject.subject !== subjectFilter) {
          return;
        }

        const current = cards.get(subject.subject) || {
          subject: subject.subject,
          highestMarks: null,
          savedMarks: 0,
          totalMarks: 0,
        };

        current.totalMarks += 1;
        if (typeof subject.marks === 'number') {
          current.savedMarks += 1;
        }
        if (typeof subject.highestMarks === 'number') {
          current.highestMarks = typeof current.highestMarks === 'number'
            ? Math.max(current.highestMarks, subject.highestMarks)
            : subject.highestMarks;
        }
        cards.set(subject.subject, current);
      });
    });

    return Array.from(cards.values()).sort((left, right) => left.subject.localeCompare(right.subject));
  }, [filteredRows, subjectFilter]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2500);
  };

  const getCellKey = (studentId: string, subject: string) => `${studentId}:${subject.toLowerCase()}`;

  const getInputValue = (studentId: string, subject: TeacherStudentSubjectPerformance) => {
    const cellKey = getCellKey(studentId, subject.subject);
    return Object.prototype.hasOwnProperty.call(draftMarks, cellKey)
      ? draftMarks[cellKey]
      : typeof subject.marks === 'number'
        ? String(subject.marks)
        : '';
  };

  const getDraftMarkValue = (_student: TeacherStudentPerformanceRow, subject: TeacherStudentSubjectPerformance, value: string) => {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      return typeof subject.marks === 'number' ? null : undefined;
    }

    const markValue = parseInt(trimmedValue, 10);
    if (isNaN(markValue) || markValue < 0 || markValue > 100) {
      return Number.NaN;
    }

    return markValue;
  };

  const hasDraftChange = useCallback((student: TeacherStudentPerformanceRow, subject: TeacherStudentSubjectPerformance) => {
    const cellKey = getCellKey(student.studentId, subject.subject);
    if (!Object.prototype.hasOwnProperty.call(draftMarks, cellKey)) {
      return false;
    }

    const rawValue = draftMarks[cellKey] ?? '';
    const trimmedValue = rawValue.trim();
    if (trimmedValue === '') {
      return false;
    }

    const parsedValue = getDraftMarkValue(student, subject, rawValue);
    return typeof parsedValue === 'number' && !Number.isNaN(parsedValue) && parsedValue !== subject.marks;
  }, [draftMarks]);

  const pendingSaveCount = useMemo(
    () => rows.reduce((count, student) => count + student.subjects.filter((subject) => hasDraftChange(student, subject)).length, 0),
    [hasDraftChange, rows]
  );

  const handleSaveAllMarks = async () => {
    const changes = rows.flatMap((student) => student.subjects.map((subject) => ({
      student,
      subject,
      cellKey: getCellKey(student.studentId, subject.subject),
      draftValue: getInputValue(student.studentId, subject),
    }))).filter(({ student, subject }) => hasDraftChange(student, subject));

    if (!changes.length) {
      showNotification('No new marks to save.');
      return;
    }

    const invalidChange = changes.find(({ student, subject, draftValue }) => Number.isNaN(getDraftMarkValue(student, subject, draftValue)));
    if (invalidChange) {
      showNotification('Enter marks between 0 and 100 before saving.');
      return;
    }

    setIsSavingAll(true);
    setSavingCells(Object.fromEntries(changes.map((change) => [change.cellKey, true])));
    try {
      await Promise.all(changes.map(async ({ student, subject, draftValue }) => {
        const markValue = getDraftMarkValue(student, subject, draftValue);
        if (typeof markValue !== 'number' || Number.isNaN(markValue)) {
          return;
        }

        await upsertStudentMark({
          studentId: student.studentId,
          studentName: student.studentName,
          sectionId: student.sectionId,
          className: student.className,
          subject: subject.subject,
          examType,
          marks: markValue,
          maxMarks: subject.maxMarks || 100,
          teacherProfileId: user?.id,
        });
      }));

      setRows((current) => current.map((row) => {
        const subjects = row.subjects.map((item) => {
          const change = changes.find(({ student, subject }) =>
            student.studentId === row.studentId && subject.subject === item.subject
          );
          if (!change) {
            return item;
          }

          const markValue = getDraftMarkValue(change.student, change.subject, change.draftValue);
          if (typeof markValue !== 'number' || Number.isNaN(markValue)) {
            return item;
          }

          return {
            ...item,
            marks: markValue,
            maxMarks: item.maxMarks || 100,
            highestMarks: typeof item.highestMarks === 'number' ? Math.max(item.highestMarks, markValue) : markValue,
          };
        });
        const savedSubjects = subjects.filter((item) => typeof item.marks === 'number');

        return {
          ...row,
          subjects,
          completedSubjects: savedSubjects.length,
        };
      }));
      setDraftMarks((current) => {
        const next = { ...current };
        changes.forEach(({ cellKey, draftValue }) => {
          next[cellKey] = draftValue.trim();
        });
        return next;
      });
      showNotification(`${changes.length} mark${changes.length === 1 ? '' : 's'} saved successfully.`);
    } finally {
      setIsSavingAll(false);
      setSavingCells({});
    }
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 md:font-bold">Marks Hub</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Edit marks directly in the student list. Only your assigned subject cells are editable.</p>
        </div>

        {notification && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 md:rounded-xl md:py-2">
            <CheckCircle size={16} />
            {notification}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { label: 'Students', value: filteredRows.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Marks Saved', value: `${completedMarks.length}/${visibleSubjectMarks.length || 0}`, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Editable Cells', value: editableSubjects, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-4 md:p-5">
            <div className={`w-fit rounded-xl p-2.5 md:p-3 ${stat.bg} ${stat.color}`}>
              <stat.icon size={18} className="md:hidden" />
              <stat.icon size={22} className="hidden md:block" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400 md:text-xs md:font-bold">{stat.label}</p>
              <p className="mt-1 break-words text-base font-black text-slate-900 md:text-2xl">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {lockedClassNames.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          <Lock size={18} />
          {examType} marks are locked by admin for: {lockedClassNames.join(', ')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm md:gap-4 md:rounded-2xl md:p-5 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Award size={14} /> Exam
          </label>
          <select
            value={examType}
            onChange={(event) => setExamType(event.target.value as ExamType)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {MARK_EXAMS.map((exam) => (
              <option key={exam} value={exam}>{exam}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Users size={14} /> Class
          </label>
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All Classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>Class {className}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter size={14} /> Subject
          </label>
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="All">All Subjects</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Search size={14} /> Search
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Student or roll no"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm md:rounded-2xl md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Highest Marks</p>
            <h3 className="text-lg font-black text-slate-900">{classFilter === 'All' ? 'Visible Classes' : `Class ${classFilter}`}</h3>
          </div>
          <Award className="text-emerald-600" size={22} />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
          {subjectHighestCards.map((card) => (
            <div key={card.subject} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-sm font-black text-slate-900">{card.subject}</p>
              <p className={`mt-2 text-2xl font-black ${scoreColor(card.highestMarks)}`}>
                {typeof card.highestMarks === 'number' ? `${card.highestMarks}%` : 'Pending'}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">{card.savedMarks}/{card.totalMarks} marks entered</p>
            </div>
          ))}
          {subjectHighestCards.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400">
              Select a class to view subject highest marks.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm md:rounded-2xl">
        <div className="space-y-2 bg-slate-50 p-2.5 md:hidden">
          {filteredRows.map((student) => (
            <div
              key={student.studentId}
              className="w-full rounded-[1.35rem] border border-slate-100 bg-white p-3.5 text-left shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black uppercase text-white">
                  {student.studentName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black leading-5 text-slate-900">{student.studentName}</p>
                      <p className="mt-1 text-xs font-bold text-slate-400">Class {student.className} - Roll {student.rollNo || '-'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-indigo-600">
                      {student.completedSubjects}/{student.subjects.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {student.subjects
                      .filter((subject) => subjectFilter === 'All' || subject.subject === subjectFilter)
                      .map((subject) => {
                        const cellKey = getCellKey(student.studentId, subject.subject);
                        const isSaving = !!savingCells[cellKey];
                        return (
                          <div key={subject.subject} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-black text-slate-900">{subject.subject}</p>
                                <p className={`text-[11px] font-bold ${subject.canEdit ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {subject.isLocked ? 'Locked by admin' : subject.canEdit ? 'Editable for you' : 'Read only'}
                                </p>
                              </div>
                              <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                                isSaving
                                  ? 'bg-blue-50 text-blue-700'
                                  : hasDraftChange(student, subject)
                                    ? 'bg-amber-50 text-amber-700'
                                    : typeof subject.marks === 'number'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isSaving ? 'Saving' : hasDraftChange(student, subject) ? 'Unsaved' : typeof subject.marks === 'number' ? 'Saved' : 'Pending'}
                              </span>
                            </div>
                            <div className="relative w-full">
                              <input
                                type="number"
                                value={getInputValue(student.studentId, subject)}
                                disabled={!subject.canEdit || isSaving}
                                min="0"
                                max="100"
                                onChange={(event) => setDraftMarks((current) => ({ ...current, [cellKey]: event.target.value }))}
                                className={`w-full rounded-xl border px-4 py-2.5 pr-12 text-base font-black outline-none focus:ring-2 ${
                                  subject.canEdit
                                    ? 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-100'
                                    : 'border-slate-100 bg-slate-100 text-slate-400'
                                }`}
                                placeholder="00"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">/100</span>
                            </div>
                            {typeof subject.highestMarks === 'number' && (
                              <p className="mt-2 text-[11px] font-bold text-slate-500">Highest: {subject.highestMarks}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && filteredRows.length === 0 && (
            <div className="rounded-[1.35rem] bg-white px-5 py-10 text-center text-sm font-bold text-slate-400">
              No students found for the selected filters.
            </div>
          )}
          {loading && (
            <div className="rounded-[1.35rem] bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
              Loading marks...
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRows.map((student) => (
                <tr
                  key={student.studentId}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black uppercase text-white">
                        {student.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{student.studentName}</p>
                        <p className="text-xs font-semibold text-slate-400">Roll {student.rollNo || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-sm font-bold text-slate-600">Class {student.className}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-3">
                      {student.subjects
                        .filter((subject) => subjectFilter === 'All' || subject.subject === subjectFilter)
                        .map((subject) => {
                          const cellKey = getCellKey(student.studentId, subject.subject);
                          const isSaving = !!savingCells[cellKey];
                          return (
                            <div key={subject.subject} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                              <div className="min-w-[120px]">
                                <p className="text-sm font-black text-slate-900">{subject.subject}</p>
                                <p className={`text-[11px] font-bold ${subject.canEdit ? 'text-indigo-600' : 'text-slate-400'}`}>
                                  {subject.isLocked ? 'Locked by admin' : subject.canEdit ? 'Editable for you' : 'Read only'}
                                </p>
                              </div>
                              <div className="relative w-full max-w-[140px]">
                                <input
                                  type="number"
                                  value={getInputValue(student.studentId, subject)}
                                  disabled={!subject.canEdit || isSaving}
                                  min="0"
                                  max="100"
                                  onChange={(event) => setDraftMarks((current) => ({ ...current, [cellKey]: event.target.value }))}
                                  className={`w-full rounded-xl border px-3 py-2 pr-11 text-base font-black outline-none focus:ring-2 ${
                                    subject.canEdit
                                      ? 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-100'
                                      : 'border-slate-100 bg-slate-100 text-slate-400'
                                  }`}
                                  placeholder="00"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-400">/100</span>
                              </div>
                              <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                                isSaving
                                  ? 'bg-blue-50 text-blue-700'
                                  : hasDraftChange(student, subject)
                                    ? 'bg-amber-50 text-amber-700'
                                    : typeof subject.marks === 'number'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isSaving ? 'Saving' : hasDraftChange(student, subject) ? 'Unsaved' : typeof subject.marks === 'number' ? 'Saved' : 'Pending'}
                              </span>
                              {typeof subject.highestMarks === 'number' && (
                                <span className="text-[11px] font-bold text-slate-500">Highest: {subject.highestMarks}</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                    No students found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {loading && (
            <div className="px-6 py-8 text-center text-sm font-bold text-slate-500">
              Loading marks...
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              {pendingSaveCount > 0 ? `${pendingSaveCount} unsaved mark${pendingSaveCount === 1 ? '' : 's'} ready to save.` : 'No unsaved mark changes.'}
            </p>
            <button
              type="button"
              onClick={() => void handleSaveAllMarks()}
              disabled={isSavingAll || pendingSaveCount === 0}
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isSavingAll ? 'Saving All Marks...' : 'Save All Marks'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksEntry;
