import { useEffect, useMemo, useState } from 'react';
import {
  MARK_EXAMS,
  fetchClassExamMarkLocks,
  fetchInstitutionMarks,
  lockClassExamMarks,
  unlockClassExamMarks,
  type ClassExamMarkLock,
  type ExamType,
  type StudentMarkRecord,
} from '../../services/marks';
import { useClassStore } from '../../store/useClassStore';
import { Search, FileText, GraduationCap, ChevronDown, Lock, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminMarksDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const sections = useClassStore((state) => state.sections);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedExam, setSelectedExam] = useState<ExamType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [marks, setMarks] = useState<StudentMarkRecord[]>([]);
  const [locks, setLocks] = useState<ClassExamMarkLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLockSaving, setIsLockSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockConfirm, setLockConfirm] = useState<'lock' | 'unlock' | null>(null);

  useEffect(() => {
    const loadMarks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchInstitutionMarks({
          className: selectedClass,
          examType: selectedExam,
          search: searchQuery.trim(),
        });
        setMarks(data);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load marks.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadMarks();
  }, [searchQuery, selectedClass, selectedExam]);

  const classOptions = useMemo(
    () => Array.from(new Set(sections.map((section) => section.name))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [sections]
  );

  const selectedSection = useMemo(
    () => sections.find((section) => section.name === selectedClass) || null,
    [sections, selectedClass]
  );

  useEffect(() => {
    const loadLocks = async () => {
      if (!selectedSection || selectedExam === 'All') {
        setLocks([]);
        return;
      }

      try {
        const data = await fetchClassExamMarkLocks({
          sectionId: selectedSection.id,
          examType: selectedExam,
        });
        setLocks(data);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load mark lock status.');
      }
    };

    void loadLocks();
  }, [selectedExam, selectedSection]);

  const activeLock = useMemo(
    () => selectedSection && selectedExam !== 'All'
      ? locks.find((lock) => lock.sectionId === selectedSection.id && lock.examType === selectedExam) || null
      : null,
    [locks, selectedExam, selectedSection]
  );

  const canManageLock = Boolean(selectedSection && selectedExam !== 'All');

  const refreshLocks = async () => {
    if (!selectedSection || selectedExam === 'All') {
      setLocks([]);
      return;
    }

    setLocks(await fetchClassExamMarkLocks({ sectionId: selectedSection.id, examType: selectedExam }));
  };

  const handleLockToggle = async () => {
    if (!selectedSection || selectedExam === 'All' || !lockConfirm) {
      return;
    }

    try {
      setIsLockSaving(true);
      setError(null);

      if (lockConfirm === 'lock') {
        await lockClassExamMarks(selectedSection.id, selectedExam, user?.id);
      } else {
        await unlockClassExamMarks(selectedSection.id, selectedExam);
      }

      await refreshLocks();
      setLockConfirm(null);
    } catch (lockError: any) {
      setError(lockError?.message || 'Unable to update lock status.');
    } finally {
      setIsLockSaving(false);
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Performance Report - institutional Marks', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filters: Class ${selectedClass}, Exam: ${selectedExam}`, 14, 30);
    
    const tableData = marks.map((mark) => [
      mark.studentName,
      mark.className,
      mark.subject,
      mark.examType,
      `${mark.marks}/${mark.maxMarks}`,
    ]);
    autoTable(doc, {
      head: [['Student', 'Class', 'Subject', 'Exam', 'Marks']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save('marks_report.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">Marks Dashboard</h2>
          <p className="text-slate-500 text-sm">Comprehensive overview of institution-wide academic performance</p>
        </div>
        
        <button 
          onClick={generateReport}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <FileText size={18} className="text-indigo-600" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search student or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="All">All Classes</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
        <div className="relative">
          <select 
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value as any)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="All">All Exams</option>
            {MARK_EXAMS.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Class Exam Lock</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">
              {canManageLock ? `${selectedClass} - ${selectedExam}` : 'Choose one class and one exam'}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Locking an exam blocks all teachers assigned to this class from changing marks for every subject in that exam.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canManageLock && (
              <span className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${activeLock ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {activeLock ? <Lock size={16} /> : <Unlock size={16} />}
                {activeLock ? 'Locked' : 'Open'}
              </span>
            )}
            <button
              type="button"
              disabled={!canManageLock}
              onClick={() => setLockConfirm(activeLock ? 'unlock' : 'lock')}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${
                activeLock ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {activeLock ? <Unlock size={16} /> : <Lock size={16} />}
              {activeLock ? 'Unlock Exam' : 'Lock Exam'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Student</th>
              <th className="px-8 py-5">Class</th>
              <th className="px-8 py-5">Subject</th>
              <th className="px-8 py-5">Exam Type</th>
              <th className="px-8 py-5 text-right">Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {marks.map((mark) => (
              <tr key={mark.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-slate-100 shadow-sm">
                      {mark.studentName.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{mark.studentName}</span>
                  </div>
                </td>
                <td className="px-8 py-5 font-bold text-slate-500 text-sm">{mark.className}</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider">
                    {mark.subject}
                  </span>
                </td>
                <td className="px-8 py-5 font-medium text-slate-600">{mark.examType}</td>
                <td className="px-8 py-5 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-base font-black ${mark.marks >= 75 ? 'text-emerald-600' : 'text-slate-900'}`}>{mark.marks}</span>
                    <span className="text-[10px] font-bold text-slate-300">OUT OF {mark.maxMarks}</span>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && marks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap size={48} className="text-slate-100" />
                    <p className="text-slate-400 font-medium">No Grade reports matching your search</p>
                  </div>
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center text-sm font-medium text-slate-500">
                  Loading marks from Supabase...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lockConfirm && selectedSection && selectedExam !== 'All' && (
        <MarkLockConfirm
          action={lockConfirm}
          className={selectedClass}
          examType={selectedExam}
          isSaving={isLockSaving}
          onCancel={() => setLockConfirm(null)}
          onConfirm={() => void handleLockToggle()}
        />
      )}
    </div>
  );
};

export default AdminMarksDashboard;

function MarkLockConfirm({
  action,
  className,
  examType,
  isSaving,
  onCancel,
  onConfirm,
}: {
  action: 'lock' | 'unlock';
  className: string;
  examType: ExamType;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [isFinalStep, setIsFinalStep] = useState(false);
  const isLocking = action === 'lock';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-sky-100/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-8 py-7 text-center shadow-2xl">
        <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${isLocking ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
          {isLocking ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900">
          {isFinalStep ? 'Final confirmation' : isLocking ? 'Lock exam marks?' : 'Unlock exam marks?'}
        </h3>
        <p className="mx-auto mt-3 max-w-xs text-sm font-medium leading-6 text-slate-500">
          {isLocking
            ? `${className} ${examType} marks will be locked for all subjects. Teachers assigned to this class cannot update marks until admin unlocks it.`
            : `${className} ${examType} marks will be reopened. Assigned teachers can update their marks again.`}
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => (isFinalStep ? onConfirm() : setIsFinalStep(true))}
            className={`w-full rounded-md px-4 py-3 text-sm font-black text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isLocking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSaving ? 'Saving...' : isFinalStep ? (isLocking ? 'Yes, lock exam' : 'Yes, unlock exam') : (isLocking ? 'Lock exam' : 'Unlock exam')}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
