import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Award, BarChart3, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchStudentMarksOverview, MARK_EXAMS, type ExamType, type StudentMarksOverview } from '../../services/marks';

const scoreColor = (marks?: number | null) => {
  if (typeof marks !== 'number') return 'text-slate-400';
  if (marks >= 75) return 'text-emerald-600';
  if (marks >= 40) return 'text-indigo-600';
  return 'text-rose-600';
};

const scorePercent = (marks?: number | null, maxMarks = 100) => {
  if (typeof marks !== 'number' || !maxMarks) return null;
  return Math.round((marks / maxMarks) * 100);
};

const formatScore = (score: number | null) => (score === null ? 'N/A' : `${score}%`);

const tamilNaduGrade = (score: number | null) => {
  if (score === null) return 'N/A';
  if (score >= 91) return 'A1';
  if (score >= 81) return 'A2';
  if (score >= 71) return 'B1';
  if (score >= 61) return 'B2';
  if (score >= 51) return 'C1';
  if (score >= 41) return 'C2';
  if (score >= 35) return 'D';
  return 'E';
};

const StudentMarks = () => {
  const { user } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState<ExamType>('Quarterly');
  const [overview, setOverview] = useState<StudentMarksOverview | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchStudentMarksOverview(user.id)
      .then(setOverview)
      .catch(console.error);
  }, [user?.id]);

  const selectedExamRows = useMemo(() => {
    return (overview?.subjects || []).map((subject) => {
      const cell = subject.exams[selectedExam];
      return {
        subject: subject.subject,
        marks: scorePercent(cell.marks, cell.maxMarks) ?? 0,
        actualMarks: cell.marks,
        highestMarks: scorePercent(cell.highestMarks, cell.maxMarks),
        maxMarks: cell.maxMarks,
      };
    });
  }, [overview?.subjects, selectedExam]);

  const completedRows = selectedExamRows.filter((row) => typeof row.actualMarks === 'number');
  const highestScore = completedRows.length ? Math.max(...completedRows.map((row) => row.marks)) : null;

  const examAverages = useMemo(() => (
    MARK_EXAMS.map((examType) => {
      const scores = (overview?.subjects || [])
        .map((subject) => {
          const cell = subject.exams[examType];
          return typeof cell.marks === 'number' && cell.maxMarks
            ? { marks: cell.marks, maxMarks: cell.maxMarks }
            : null;
        })
        .filter((score): score is { marks: number; maxMarks: number } => score !== null);

      const totalMarks = scores.reduce((sum, score) => sum + score.marks, 0);
      const totalMaxMarks = scores.reduce((sum, score) => sum + score.maxMarks, 0);
      const average = totalMaxMarks
        ? Math.round((totalMarks / totalMaxMarks) * 100)
        : null;

      return {
        examType,
        average,
        grade: tamilNaduGrade(average),
        completedSubjects: scores.length,
        totalSubjects: overview?.subjects.length || 0,
      };
    })
  ), [overview?.subjects]);

  const selectedAverage = examAverages.find((exam) => exam.examType === selectedExam)?.average ?? null;
  const selectedGrade = tamilNaduGrade(selectedAverage);

  const stats = [
    { title: 'Highest Marks', value: formatScore(highestScore), icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Average Marks', value: formatScore(selectedAverage), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Grade', value: selectedGrade, icon: Award, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Subjects', value: overview?.subjects.length || 0, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Class', value: overview?.className || '-', icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const examFilter = (compact = false) => (
    <div className={`${compact ? 'mobile-sticky-filter -mx-1 rounded-[1.35rem] border border-white/80 bg-white/95 p-1.5 shadow-lg shadow-slate-200/70 backdrop-blur-xl md:hidden' : 'grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm min-[390px]:grid-cols-4 md:flex'}`}>
      {MARK_EXAMS.map((type) => (
        <button
          key={type}
          onClick={() => setSelectedExam(type)}
          className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all md:px-4 md:py-2 ${
            selectedExam === type
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 lg:space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 md:font-bold">Academic Progress</h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">Your marks are shown from your section subject list across every exam.</p>
        </div>

        <div className="hidden md:block">{examFilter()}</div>
      </div>
      {examFilter(true)}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 md:gap-6">
        {stats.map((stat) => (
          <div key={stat.title} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-4 md:p-5">
            <div className={`w-fit rounded-xl p-2.5 md:p-3 ${stat.bg} ${stat.color}`}>
              <stat.icon size={18} className="md:hidden" />
              <stat.icon size={22} className="hidden md:block" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase leading-tight tracking-wider text-slate-400 md:text-xs md:font-bold">{stat.title}</p>
              <p className="mt-1 break-words text-base font-black text-slate-900 md:text-2xl">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm md:rounded-2xl md:p-6">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
            <TrendingUp className="text-indigo-600" size={20} />
            {selectedExam} Subject Performance
          </h3>
          <div className="h-[240px] w-full md:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedExamRows} margin={{ left: -20, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(_value, _name, item) => {
                    const payload = item.payload as { actualMarks?: number; marks: number };
                    return [typeof payload.actualMarks === 'number' ? `${payload.marks}%` : 'Pending', 'Marks'];
                  }}
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(15 23 42 / 0.08)' }}
                />
                <Bar dataKey="marks" radius={[8, 8, 0, 0]} barSize={38}>
                  {selectedExamRows.map((entry) => (
                    <Cell
                      key={entry.subject}
                      fill={typeof entry.actualMarks !== 'number'
                        ? '#cbd5e1'
                        : entry.marks >= 75
                          ? '#10b981'
                          : entry.marks >= 40
                            ? '#6366f1'
                            : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm md:rounded-2xl md:p-6">
          <h3 className="mb-6 text-lg font-bold text-slate-900">Average Marks by Exam</h3>
          <div className="space-y-3">
            {examAverages.map((exam) => (
              <div key={exam.examType} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{exam.examType}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {exam.completedSubjects}/{exam.totalSubjects} subjects completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${scoreColor(exam.average)}`}>{formatScore(exam.average)}</p>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Grade {exam.grade}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${exam.average ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 md:hidden">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Marks</p>
            <h3 className="text-base font-black text-slate-900">{selectedExam} Results</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            {completedRows.length}/{selectedExamRows.length}
          </span>
        </div>
        <div className="space-y-2 bg-slate-50 p-2.5 md:hidden">
          {(overview?.subjects || []).map((subject) => {
            const cell = subject.exams[selectedExam];
            const marks = scorePercent(cell.marks, cell.maxMarks);
            const highestMarks = scorePercent(cell.highestMarks, cell.maxMarks);
            return (
              <div key={subject.subject} className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-indigo-50 text-indigo-600">
                    <BookOpen size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-black text-slate-900">{subject.subject}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wider text-slate-400">{selectedExam}</p>
                        <p className={`mt-1 text-lg font-black ${scoreColor(marks)}`}>
                          {marks === null ? 'Pending' : `${marks}%`}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wider text-slate-400">Highest</p>
                        <p className={`mt-1 text-lg font-black ${scoreColor(highestMarks)}`}>
                          {highestMarks === null ? 'Pending' : `${highestMarks}%`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!overview?.subjects.length && (
            <div className="rounded-[1.35rem] bg-white px-5 py-10 text-center text-sm font-bold text-slate-400">
              No subjects are linked to your section yet.
            </div>
          )}
        </div>
        <div className="hidden md:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">{selectedExam}</th>
              <th className="px-6 py-4">Highest Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(overview?.subjects || []).map((subject) => {
              const cell = subject.exams[selectedExam];
              const marks = scorePercent(cell.marks, cell.maxMarks);
              const highestMarks = scorePercent(cell.highestMarks, cell.maxMarks);
              return (
                <tr key={subject.subject} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-indigo-600">
                        <BookOpen size={18} />
                      </div>
                      <p className="font-bold text-slate-900">{subject.subject}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-lg font-black ${scoreColor(marks)}`}>
                      {marks === null ? 'Pending' : `${marks}%`}
                    </span>
                    <p className="text-xs font-semibold text-slate-400">Max {cell.maxMarks}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-black ${scoreColor(highestMarks)}`}>
                      {highestMarks === null ? 'Pending' : `${highestMarks}%`}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!overview?.subjects.length && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                  No subjects are linked to your section yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default StudentMarks;
