import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Award, BookOpen, CalendarCheck, Mail, Phone, Plus, Upload, UserRound, Users, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import { fetchStudentMarksByProfile, fetchTeacherMarkScopes, type StudentMarkRecord, type TeacherMarkScope } from '../../services/marks';
import { fetchStudentAttendanceSummary } from '../../services/attendance';
import type { IStudent } from '../../types/school';
import { getTodayInputDate } from '../../utils/dateLimits';

const parseBulkStudentLine = (line: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && (char === ',' || char === '\t')) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const normalizeBulkGender = (value: string): IStudent['gender'] => {
  const gender = value.trim().toLowerCase();
  if (gender === 'female' || gender === 'f') return 'Female';
  if (gender === 'other' || gender === 'o') return 'Other';
  return 'Male';
};

const parseBulkStudents = (
  input: string,
  categoryId: string,
  sectionId: string
): Array<Omit<IStudent, 'id'>> => {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line, index) => {
    if (index !== 0) return true;
    const [nameHeader, emailHeader] = parseBulkStudentLine(line).map((cell) => cell.toLowerCase());
    return !(nameHeader === 'name' && emailHeader === 'email');
  });

  return dataLines.map((line, index) => {
    const [name, email, rollNo, gender = 'Male', dob, contact, parentName, parentContact, address = 'New Delhi'] = parseBulkStudentLine(line);

    if (!name || !email || !rollNo || !dob || !contact || !parentName || !parentContact) {
      throw new Error(`Line ${index + 1} is missing required data.`);
    }

    return {
      name,
      email: email.toLowerCase(),
      rollNo,
      categoryId,
      sectionId,
      gender: normalizeBulkGender(gender),
      dob,
      contact,
      parentName,
      parentContact,
      address,
    };
  });
};

const TeacherClasses = () => {
  const user = useAuthStore((state) => state.user);
  const initialize = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const students = useClassStore((state) => state.students);
  const addStudent = useClassStore((state) => state.addStudent);
  const addStudents = useClassStore((state) => state.addStudents);
  const isLoading = useClassStore((state) => state.isLoading);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markScopes, setMarkScopes] = useState<TeacherMarkScope[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
  const [studentMetrics, setStudentMetrics] = useState<Record<string, { averageMarks: number | null; attendanceRate: number | null }>>({});
  const [studentDetail, setStudentDetail] = useState<{
    attendanceRate: number | null;
    attendanceTotal: number;
    marks: StudentMarkRecord[];
  }>({ attendanceRate: null, attendanceTotal: 0, marks: [] });
  const [isStudentDetailLoading, setIsStudentDetailLoading] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileRosterOpen, setIsMobileRosterOpen] = useState(false);
  const maxDob = getTodayInputDate();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncViewport = () => setIsMobileView(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user?.id || user.role !== 'Teacher') {
      setMarkScopes([]);
      return;
    }

    void fetchTeacherMarkScopes(user.id)
      .then(setMarkScopes)
      .catch(console.error);
  }, [user?.id, user?.role]);

  const allowedClasses = useMemo(
    () => Array.from(new Set([...(user?.classes || []), ...(user?.standards || [])])),
    [user?.classes, user?.standards]
  );
  const ownedClass = user?.class;

  const subjectsByClassName = useMemo(
    () =>
      markScopes.reduce<Record<string, string[]>>((acc, scope) => {
        const current = acc[scope.className] || [];
        if (!current.includes(scope.subject)) {
          current.push(scope.subject);
        }
        acc[scope.className] = current;
        return acc;
      }, {}),
    [markScopes]
  );

  const visibleSections = useMemo(() => {
    const scopedSections = sections.filter((section) => allowedClasses.includes(section.name));
    return [...scopedSections].sort((left, right) => {
      if (left.name === ownedClass && right.name !== ownedClass) {
        return -1;
      }
      if (right.name === ownedClass && left.name !== ownedClass) {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
  }, [allowedClasses, ownedClass, sections]);

  useEffect(() => {
    if (!visibleSections.length) {
      setActiveSectionId(null);
      return;
    }

    if (!activeSectionId || !visibleSections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [activeSectionId, visibleSections]);

  const activeSection = visibleSections.find((section) => section.id === activeSectionId) ?? null;
  const canEditActiveSection = !!activeSection && activeSection.name === ownedClass;

  const visibleStudents = useMemo(
    () => students
      .filter((student) => student.sectionId === activeSectionId)
      .sort((left, right) => left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true })),
    [students, activeSectionId]
  );

  useEffect(() => {
    if (!canEditActiveSection) {
      setShowForm(false);
      setShowBulkForm(false);
    }
  }, [canEditActiveSection]);

  useEffect(() => {
    if (!selectedStudent || visibleStudents.some((student) => student.id === selectedStudent.id)) {
      return;
    }

    setSelectedStudent(null);
  }, [selectedStudent, visibleStudents]);

  useEffect(() => {
    if (!isMobileView) {
      setIsMobileRosterOpen(false);
    }
  }, [isMobileView]);

  useEffect(() => {
    if (!visibleStudents.length) {
      setStudentMetrics({});
      return;
    }

    let active = true;

    Promise.all(
      visibleStudents.map(async (student) => {
        const [attendanceSummary, markRows] = await Promise.all([
          fetchStudentAttendanceSummary(student.id).catch(() => null),
          student.profileId
            ? fetchStudentMarksByProfile(student.profileId).catch(() => [])
            : Promise.resolve([]),
        ]);
        const markPercentages = markRows
          .map((mark) => (mark.maxMarks ? Math.round((mark.marks / mark.maxMarks) * 100) : null))
          .filter((score): score is number => typeof score === 'number');

        return {
          studentId: student.id,
          averageMarks: markPercentages.length
            ? Math.round(markPercentages.reduce((sum, score) => sum + score, 0) / markPercentages.length)
            : null,
          attendanceRate: attendanceSummary?.attendanceRate ?? null,
        };
      })
    ).then((rows) => {
      if (!active) {
        return;
      }

      setStudentMetrics(
        rows.reduce<Record<string, { averageMarks: number | null; attendanceRate: number | null }>>((acc, row) => {
          acc[row.studentId] = {
            averageMarks: row.averageMarks,
            attendanceRate: row.attendanceRate,
          };
          return acc;
        }, {})
      );
    });

    return () => {
      active = false;
    };
  }, [visibleStudents]);

  useEffect(() => {
    if (!selectedStudent) {
      setStudentDetail({ attendanceRate: null, attendanceTotal: 0, marks: [] });
      return;
    }

    let active = true;
    setIsStudentDetailLoading(true);
    Promise.all([
      fetchStudentAttendanceSummary(selectedStudent.id).catch(() => null),
      selectedStudent.profileId
        ? fetchStudentMarksByProfile(selectedStudent.profileId).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([attendanceSummary, markRows]) => {
        if (!active) {
          return;
        }

        setStudentDetail({
          attendanceRate: attendanceSummary?.attendanceRate ?? null,
          attendanceTotal: attendanceSummary?.totalCount ?? 0,
          marks: markRows,
        });
      })
      .finally(() => {
        if (active) {
          setIsStudentDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedStudent]);

  const handleAddStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeSection || !canEditActiveSection) {
      setError('You can edit only your own class section.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setError(null);

    try {
      await addStudent({
        name: String(formData.get('name') || ''),
        rollNo: String(formData.get('rollNo') || ''),
        categoryId: activeSection.categoryId,
        sectionId: activeSection.id,
        gender: String(formData.get('gender') || 'Male') as 'Male' | 'Female' | 'Other',
        dob: String(formData.get('dob') || ''),
        contact: String(formData.get('contact') || ''),
        parentName: String(formData.get('parentName') || ''),
        parentContact: String(formData.get('parentContact') || ''),
        address: String(formData.get('address') || ''),
        email: String(formData.get('email') || ''),
      });
      event.currentTarget.reset();
      setShowForm(false);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to add student.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAddStudents = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeSection || !canEditActiveSection) {
      setError('You can edit only your own class section.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setError(null);

    try {
      const parsedStudents = parseBulkStudents(String(formData.get('students') || ''), activeSection.categoryId, activeSection.id);
      await addStudents(parsedStudents);
      event.currentTarget.reset();
      setShowBulkForm(false);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to import students.');
    } finally {
      setIsSaving(false);
    }
  };

  const latestMarks = useMemo(() => {
    const bySubject = new Map<string, StudentMarkRecord>();
    studentDetail.marks.forEach((mark) => {
      bySubject.set(mark.subject, mark);
    });
    return Array.from(bySubject.values()).slice(0, 4);
  }, [studentDetail.marks]);

  const subjectSummary = activeSection?.subjectTeachers?.map((teacher) => teacher.subject) || [];
  const classCardTones = [
    {
      line: 'border-t-[#2f6fb4]',
      title: 'text-[#2f6fb4]',
      badge: 'bg-blue-50 text-[#2f6fb4]',
      focus: 'ring-[#2f6fb4]/15',
    },
    {
      line: 'border-t-emerald-600',
      title: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700',
      focus: 'ring-emerald-600/15',
    },
    {
      line: 'border-t-violet-600',
      title: 'text-violet-700',
      badge: 'bg-violet-50 text-violet-700',
      focus: 'ring-violet-600/15',
    },
    {
      line: 'border-t-orange-500',
      title: 'text-orange-600',
      badge: 'bg-orange-50 text-orange-700',
      focus: 'ring-orange-500/15',
    },
    {
      line: 'border-t-rose-600',
      title: 'text-rose-700',
      badge: 'bg-rose-50 text-rose-700',
      focus: 'ring-rose-600/15',
    },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden max-lg:px-0 max-lg:pb-1 lg:space-y-8">
      <div className="space-y-5 lg:space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="text-[#3f5f9f]">Home</span>
            <span>/</span>
            <span className="text-[#3f5f9f]">My Classes</span>
            <span>/</span>
            <span className="text-slate-700">My Class Roster</span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 lg:text-[32px]">My Class Roster</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-6 text-slate-500">
            You can view assigned subject sections, but student edits are limited to your own class.
          </p>
        </div>
        <div className="w-full rounded border border-slate-200 bg-white px-5 py-5 shadow-sm lg:w-32">
          <p className="text-sm font-semibold text-slate-500">Owned Class</p>
          <p className="mt-4 text-xl font-semibold text-[#2f6fb4]">
            {ownedClass || 'No owned class assigned yet'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          Loading teacher roster...
        </div>
      )}

      {!isLoading && !visibleSections.length && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white px-5 py-10 text-center shadow-sm lg:rounded-[2rem] lg:px-8">
          <BookOpen size={36} className="mx-auto text-slate-200" />
          <h2 className="mt-4 text-xl font-black text-slate-900">No classes assigned</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add this teacher to a section in the section teacher assignments table.
          </p>
        </div>
      )}

      {!!visibleSections.length && (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleSections.map((section, sectionIndex) => {
              const sectionStudents = students.filter((student) => student.sectionId === section.id);
              const isActive = section.id === activeSectionId;
              const isOwned = section.name === ownedClass;
              const handledSubjects = subjectsByClassName[section.name] || [];
              const tone = isOwned ? classCardTones[0] : classCardTones[(sectionIndex % (classCardTones.length - 1)) + 1];

              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSectionId(section.id);
                    if (isMobileView) {
                      setIsMobileRosterOpen(true);
                    }
                  }}
                  className={`min-h-[235px] w-full min-w-0 overflow-hidden rounded border border-slate-200 border-t-4 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md ${tone.line} ${
                    isActive ? `ring-4 ${tone.focus}` : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className={`break-words text-3xl font-semibold tracking-tight ${tone.title}`}>{section.name}</h2>
                      <p className={`mt-10 w-fit rounded px-3 py-1 text-sm font-semibold ${isOwned ? 'bg-blue-50 text-[#2f6fb4]' : tone.badge}`}>
                        {isOwned ? 'Own Class' : 'Subject Class'}
                      </p>
                    </div>
                    <div className="shrink-0 rounded bg-slate-50 px-4 py-3 text-center">
                      <p className="text-xl font-semibold leading-none text-slate-500">{sectionStudents.length}</p>
                      <p className="mt-2 text-sm font-normal text-slate-500">Students</p>
                    </div>
                  </div>
                  <div className="mt-7 space-y-3 text-[15px] leading-6 text-slate-600">
                    <p className="break-words">Class Teacher: <span className="font-semibold text-slate-900">{section.classTeacher}</span></p>
                    <p className="break-words">Subject: <span className="font-semibold text-slate-900">{handledSubjects.length ? handledSubjects.join(', ') : 'Class oversight'}</span></p>
                    <p className="break-words">Room: <span className="font-semibold text-slate-900">{section.roomNumber || 'TBD'}</span></p>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 lg:hidden">
                    <span>Open roster</span>
                    <span>{isActive ? 'Selected' : 'Tap'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeSection && (
            <div className="hidden w-full min-w-0 rounded-[1.5rem] border border-slate-100 bg-white p-3.5 shadow-sm md:block lg:rounded-[2rem] lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Roster</p>
                  <h2 className="mt-2 break-words text-2xl font-black text-slate-900 lg:text-3xl">{activeSection.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {canEditActiveSection
                      ? 'You own this class, so roster edits are enabled.'
                      : 'This is a subject-teacher section, so roster edits are locked.'}
                  </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-3 lg:w-auto">
                  <button
                    onClick={() => {
                      setShowBulkForm((current) => !current);
                      setShowForm(false);
                    }}
                    disabled={!canEditActiveSection}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 lg:px-5"
                  >
                    {showBulkForm ? <ArrowLeft size={16} /> : <Upload size={16} />}
                    {showBulkForm ? 'Close Bulk' : 'Bulk Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm((current) => !current);
                      setShowBulkForm(false);
                    }}
                    disabled={!canEditActiveSection}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 lg:px-5"
                  >
                    {showForm ? <ArrowLeft size={16} /> : <Plus size={16} />}
                    {showForm ? 'Close Form' : 'Add Student'}
                  </button>
                </div>
              </div>

              {showBulkForm && (
                <form onSubmit={handleBulkAddStudents} className="mt-5 w-full min-w-0 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-3.5 lg:mt-6 lg:rounded-[2rem] lg:p-5">
                  <div className="rounded-2xl border border-white/70 bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Bulk Student Rows</p>
                    <p className="mt-1 text-xs font-bold text-emerald-950">
                      name, email, roll no, gender, dob, contact, parent name, parent contact, address
                    </p>
                  </div>
                  <textarea
                    name="students"
                    required
                    rows={8}
                    placeholder={'Rahul Sharma, rahul@school.edu, 101, Male, 2012-04-18, 9876543210, Amit Sharma, 9876543210, New Delhi\nPriya Singh, priya@school.edu, 102, Female, 2012-07-09, 9876543211, Neha Singh, 9876543211, New Delhi'}
                    className="mt-4 w-full resize-y rounded-2xl border border-emerald-100 bg-white p-4 font-mono text-sm font-semibold text-slate-900 outline-none focus:border-emerald-300"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload size={16} />
                    {isSaving ? 'Importing...' : 'Import Students'}
                  </button>
                </form>
              )}

              {showForm && (
                <form onSubmit={handleAddStudent} className="mt-5 grid w-full min-w-0 grid-cols-1 gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3.5 md:grid-cols-2 lg:mt-6 lg:rounded-[2rem] lg:p-5 xl:grid-cols-3">
                  <input name="name" required placeholder="Student name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="rollNo" required placeholder="Roll number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="email" type="email" required placeholder="Student login email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <select name="gender" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input name="dob" type="date" max={maxDob} required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="contact" required placeholder="Student contact" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="parentName" required placeholder="Parent name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="parentContact" required placeholder="Parent contact" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300" />
                  <input name="address" required placeholder="Address" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-300 md:col-span-2 xl:col-span-3" />
                  <div className="md:col-span-2 xl:col-span-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={16} />
                      {isSaving ? 'Saving...' : 'Create Student Record'}
                    </button>
                  </div>
                </form>
              )}

              {canEditActiveSection && (
                <div className="mt-5 w-full min-w-0 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-3.5 lg:mt-6 lg:rounded-[2rem] lg:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-600">Owned Class Subject Map</p>
                      <h3 className="mt-2 text-xl font-black text-slate-900">{activeSection.classTeacher}</h3>
                      <p className="mt-1 text-sm text-emerald-900">
                        This staffing view is shown only for the class where you are the class teacher.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(activeSection.subjectTeachers || []).length ? activeSection.subjectTeachers?.map((teacher) => (
                      <div key={`${teacher.subject}:${teacher.id}`} className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-black text-slate-900">{teacher.subject}</p>
                        <p className="mt-1 text-sm text-slate-600">{teacher.name}</p>
                        <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${teacher.name === activeSection.classTeacher ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {teacher.name === activeSection.classTeacher ? 'Class Teacher Subject' : 'Subject Teacher'}
                        </p>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/70 bg-white px-4 py-5 text-sm text-slate-500 shadow-sm md:col-span-2">
                        No subject staffing is available for this class yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 w-full min-w-0 rounded-[1.35rem] border border-slate-100 bg-slate-50 p-2 shadow-inner shadow-slate-100/60 md:mt-6 md:overflow-hidden md:rounded-[1.75rem] md:bg-white md:p-0 md:shadow-none lg:rounded-[2rem]">
                {visibleStudents.length ? (
                  <>
                  <div className="space-y-2 md:hidden">
                    {visibleStudents.map((student) => {
                      const metrics = studentMetrics[student.id];
                      return (
                      <div
                        key={student.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedStudent(student)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedStudent(student);
                          }
                        }}
                        className="w-full min-w-0 rounded-[1.15rem] border border-slate-100 bg-white p-2.5 text-left shadow-sm transition-all active:scale-[0.99] active:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-emerald-50 text-sm font-black text-emerald-700">
                            {student.rollNo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="min-w-0 truncate text-base font-black leading-5 text-slate-900">{student.name}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{student.email || 'No email'}</p>
                          </div>
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-[1rem] bg-slate-50 px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parent</p>
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{student.parentName}</p>
                          </div>
                          <div className="min-w-0 border-l border-slate-200 pl-2 text-right">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parent Contact</p>
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{student.parentContact}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Marks</p>
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                              {metrics?.averageMarks === null || !metrics ? 'N/A' : `${metrics.averageMarks}%`}
                            </p>
                          </div>
                          <div className="min-w-0 border-l border-slate-200 pl-2 text-right">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance</p>
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                              {metrics?.attendanceRate === null || !metrics ? 'N/A' : `${metrics.attendanceRate}%`}
                            </p>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                          <th className="px-5 py-4">Roll</th>
                          <th className="px-5 py-4">Student</th>
                          <th className="px-5 py-4">Parent</th>
                          <th className="px-5 py-4">Parent Contact</th>
                          <th className="px-5 py-4">Average Marks</th>
                          <th className="px-5 py-4">Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((student) => {
                          const metrics = studentMetrics[student.id];
                          return (
                          <tr key={student.id} className="border-t border-slate-100 bg-white hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-4 font-black text-slate-300">{student.rollNo}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-black flex items-center justify-center shrink-0">
                                  {student.name[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{student.name}</p>
                                  <p className="text-xs text-slate-500">{student.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-700">{student.parentName}</td>
                            <td className="px-5 py-4 text-slate-500">{student.parentContact}</td>
                            <td className="px-5 py-4 font-black text-slate-900">
                              {metrics?.averageMarks === null || !metrics ? 'N/A' : `${metrics.averageMarks}%`}
                            </td>
                            <td className="px-5 py-4 font-black text-slate-900">
                              {metrics?.attendanceRate === null || !metrics ? 'N/A' : `${metrics.attendanceRate}%`}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </>
                ) : (
                  <div className="bg-slate-50 px-6 py-10 text-center">
                    <Users size={32} className="mx-auto text-slate-200" />
                    <p className="mt-4 text-sm font-medium text-slate-500">No students found in this section yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            aria-label="Close student profile"
            onClick={() => setSelectedStudent(null)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[2rem] bg-[#f7f8fb] p-3 shadow-2xl">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-950">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Student Profile</p>
                    <h3 className="mt-1 truncate text-xl font-black">{selectedStudent.name}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-300">
                      Roll {selectedStudent.rollNo} - {activeSection?.name || 'Class'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[1.25rem] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <CalendarCheck size={18} className="text-emerald-600" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance</p>
                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {isStudentDetailLoading ? '...' : studentDetail.attendanceRate === null ? 'N/A' : `${studentDetail.attendanceRate}%`}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">{studentDetail.attendanceTotal} records</p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <Award size={18} className="text-indigo-600" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Marks</p>
                <p className="mt-0.5 text-xl font-black text-slate-900">
                  {isStudentDetailLoading ? '...' : studentDetail.marks.length}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">entries</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <section className="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h4 className="text-sm font-black text-slate-900">Contact</h4>
                <div className="mt-3 space-y-2">
                  {[
                    { icon: Phone, label: 'Student', value: selectedStudent.contact },
                    { icon: UserRound, label: 'Parent', value: selectedStudent.parentName },
                    { icon: Phone, label: 'Parent Contact', value: selectedStudent.parentContact },
                    { icon: Mail, label: 'Email', value: selectedStudent.email || 'No email' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                      <item.icon size={16} className="shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="truncate text-xs font-bold text-slate-800">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h4 className="text-sm font-black text-slate-900">Academic Overview</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(subjectSummary.length ? subjectSummary : ['No subjects mapped']).map((subject) => (
                    <span key={subject} className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">Gender</p>
                    <p className="mt-1 font-bold text-slate-800">{selectedStudent.gender}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="font-black uppercase tracking-wider text-slate-400">DOB</p>
                    <p className="mt-1 font-bold text-slate-800">{selectedStudent.dob}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <h4 className="text-sm font-black text-slate-900">Recent Marks</h4>
                <div className="mt-3 space-y-2">
                  {latestMarks.length ? latestMarks.map((mark) => (
                    <div key={mark.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">{mark.subject}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{mark.examType}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-indigo-600">{mark.marks}/{mark.maxMarks}</p>
                    </div>
                  )) : (
                    <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-400">
                      {selectedStudent.profileId ? 'No marks recorded yet.' : 'Marks require a linked student profile.'}
                    </p>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {isMobileView && isMobileRosterOpen && activeSection && (
        <div className="fixed inset-0 z-[75] md:hidden">
          <button
            type="button"
            aria-label="Close class roster"
            onClick={() => setIsMobileRosterOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[2rem] bg-[#f7f8fb] p-3 shadow-2xl">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Class Roster</p>
                  <h3 className="mt-1 text-2xl font-black">{activeSection.name}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-300">
                    {visibleStudents.length} student{visibleStudents.length === 1 ? '' : 's'} • tap a student for full details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileRosterOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {visibleStudents.length ? visibleStudents.map((student) => {
                const metrics = studentMetrics[student.id];
                return (
                  <div
                    key={student.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStudent(student)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedStudent(student);
                      }
                    }}
                    className="w-full min-w-0 rounded-[1.15rem] border border-slate-100 bg-white p-2.5 text-left shadow-sm transition-all active:scale-[0.99] active:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-emerald-50 text-sm font-black text-emerald-700">
                        {student.rollNo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="min-w-0 truncate text-base font-black leading-5 text-slate-900">{student.name}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{student.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-[1rem] bg-slate-50 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parent</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{student.parentName}</p>
                      </div>
                      <div className="min-w-0 border-l border-slate-200 pl-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Parent Contact</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">{student.parentContact}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Marks</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                          {metrics?.averageMarks === null || !metrics ? 'N/A' : `${metrics.averageMarks}%`}
                        </p>
                      </div>
                      <div className="min-w-0 border-l border-slate-200 pl-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance</p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                          {metrics?.attendanceRate === null || !metrics ? 'N/A' : `${metrics.attendanceRate}%`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-[1.35rem] bg-white px-5 py-10 text-center text-sm font-bold text-slate-400">
                  No students found in this section yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      </div>
    </div>
  );
};

export default TeacherClasses;
