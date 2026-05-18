import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle,
  CheckSquare,
  CreditCard,
  Download,
  Edit3,
  FileText,
  Filter,
  GraduationCap,
  MessageSquare,
  Send,
  Users,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '../../store/useAuthStore';
import { useClassStore } from '../../store/useClassStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from '../../lib/supabase';
import {
  fetchFeeRecords,
  saveAccountantNote,
  sendFeeReminders,
  updateFeeStatuses,
  type FeeRecord,
} from '../../services/erpContent';

type FeeStatus = 'Paid' | 'Pending' | 'Partial';
type CategoryDueState = 'active' | 'upcoming' | 'overdue' | 'completed' | 'unscheduled';

interface ClassSummary {
  key: string;
  label: string;
  grade: number;
  section: string;
  recordCount: number;
  studentCount: number;
  paidCount: number;
  pendingCount: number;
  completion: number;
}

const feeCategories = ['All Categories', 'Tuition Fee', 'Term Fee', 'Book Fee', 'Note Fee', 'Exam Fee'];
const statusFilters = ['All Status', 'Paid', 'Pending', 'Partial'];
const dueDateStorageKey = 'vernex-accountant-category-due-dates';

const splitSectionName = (sectionName?: string) => {
  if (!sectionName) {
    return { className: '-', section: '-' };
  }

  const [className, section] = sectionName.split('-');
  return {
    className: className || sectionName,
    section: section || '-',
  };
};

const getGradeNumber = (sectionName?: string) => {
  const { className } = splitSectionName(sectionName);
  const match = className.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const getClassKey = (sectionName?: string) => {
  const { className, section } = splitSectionName(sectionName);
  return `${className}-${section}`;
};

const getClassLabel = (sectionName?: string) => {
  const { className, section } = splitSectionName(sectionName);
  if (className === '-') {
    return 'Unassigned';
  }
  return section === '-' ? className : `${className}${section}`;
};

const normalizeStatus = (status?: string): FeeStatus => {
  if (status === 'Paid' || status === 'Partial') {
    return status;
  }
  return 'Pending';
};

const statusStyles: Record<FeeStatus, string> = {
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Partial: 'border-sky-200 bg-sky-50 text-sky-700',
};

const categoryStateStyles: Record<CategoryDueState, {
  panel: string;
  badge: string;
  card: string;
  accent: string;
}> = {
  active: {
    panel: 'border-emerald-100 bg-emerald-50/70',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    card: 'border-slate-100 bg-white',
    accent: 'text-emerald-700',
  },
  upcoming: {
    panel: 'border-amber-100 bg-amber-50/80',
    badge: 'border-amber-200 bg-amber-100 text-amber-700',
    card: 'border-amber-100 bg-white',
    accent: 'text-amber-700',
  },
  overdue: {
    panel: 'border-rose-100 bg-rose-50/80',
    badge: 'border-rose-200 bg-rose-100 text-rose-700',
    card: 'border-rose-200 bg-rose-50/30',
    accent: 'text-rose-700',
  },
  completed: {
    panel: 'border-emerald-100 bg-emerald-50',
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    card: 'border-emerald-100 bg-white',
    accent: 'text-emerald-700',
  },
  unscheduled: {
    panel: 'border-slate-100 bg-slate-50',
    badge: 'border-slate-200 bg-white text-slate-600',
    card: 'border-slate-100 bg-white',
    accent: 'text-slate-600',
  },
};

const parseLocalDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDueDate = (value?: string) => {
  const date = parseLocalDate(value);
  return date
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
    : 'Set due date';
};

const getDaysUntil = (value?: string) => {
  const dueDate = parseLocalDate(value);
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
};

const getDueLabel = (value?: string, completed = false) => {
  if (completed) {
    return 'Completed';
  }

  const days = getDaysUntil(value);
  if (days === null) {
    return 'No deadline';
  }

  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  }

  if (days === 0) {
    return 'Due today';
  }

  return `${days} day${days === 1 ? '' : 's'} remaining`;
};

const FinanceDashboard = () => {
  const { user } = useAuthStore();
  const initializeSchoolData = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const [notification, setNotification] = useState<string | null>(null);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [categoryDueDates, setCategoryDueDates] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(dueDateStorageKey) || '{}') as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [recentActions, setRecentActions] = useState<string[]>([]);

  useEffect(() => {
    void initializeSchoolData();
  }, [initializeSchoolData]);

  const loadFees = useCallback(async () => {
    try {
      const records = await fetchFeeRecords(user?.role === 'Student' ? user.email : undefined);
      setFeeRecords(records);
      setNotes((current) => ({
        ...Object.fromEntries(records.filter((fee) => fee.latestNote !== undefined).map((fee) => [fee.id, fee.latestNote || ''])),
        ...current,
      }));
    } catch (error) {
      console.error('Failed to load fee records:', error);
    }
  }, [user?.email, user?.role]);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(dueDateStorageKey, JSON.stringify(categoryDueDates));
  }, [categoryDueDates]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    const client = supabase;
    const channel = client
      .channel('fee-operations-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fee_records' }, () => void loadFees())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accountant_notes' }, () => void loadFees())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_reminders' }, () => void loadFees())
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadFees]);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const pushRecentAction = (message: string) => {
    setRecentActions((current) => [message, ...current].slice(0, 4));
  };

  const handleDownloadBill = (fee: FeeRecord) => {
    const doc = new jsPDF();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(24);
    doc.text('EduSync ERP - Fee Receipt', 14, 25);

    doc.setTextColor(50);
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${fee.id.toUpperCase()}`, 14, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 58);
    doc.text(`Student: ${fee.studentName || user?.name || fee.studentEmail}`, 14, 66);
    doc.text(`Status: ${fee.status}`, 14, 74);

    autoTable(doc, {
      head: [['Fee Description', 'Amount']],
      body: [
        ['Paid Amount', formatCurrency(Number(fee.paidAmount).toFixed(2))],
        ['Pending Amount', formatCurrency(Number(fee.pendingAmount).toFixed(2))],
        ['Total Amount', formatCurrency(Number(fee.totalAmount).toFixed(2))],
      ],
      startY: 85,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`Fee_Receipt_${fee.type}.pdf`);
    showToast('Bill downloaded successfully.');
  };

  const staffView = user?.role === 'Admin' || user?.role === 'Accountant';

  const recordsWithLocalStatus = useMemo(
    () => feeRecords.map((fee) => ({ ...fee, status: normalizeStatus(fee.status) })),
    [feeRecords]
  );

  useEffect(() => {
    if (!recordsWithLocalStatus.length) {
      return;
    }

    setCategoryDueDates((current) => {
      const next = { ...current };
      let changed = false;
      recordsWithLocalStatus.forEach((fee) => {
        if (fee.type && fee.dueDate && !next[fee.type]) {
          next[fee.type] = fee.dueDate;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [recordsWithLocalStatus]);

  const gradeSummaries = useMemo(() => {
    const grades = Array.from({ length: 12 }, (_, index) => index + 1);

    return grades.map((grade) => {
      const gradeRecords = recordsWithLocalStatus.filter((fee) => getGradeNumber(fee.sectionName) === grade);
      const classCount = new Set([
        ...gradeRecords.map((fee) => getClassKey(fee.sectionName)),
        ...sections.filter((section) => getGradeNumber(section.name) === grade).map((section) => getClassKey(section.name)),
      ]).size;
      const completion = gradeRecords.length
        ? Math.round((gradeRecords.filter((fee) => fee.status === 'Paid').length / gradeRecords.length) * 100)
        : 0;

      return {
        grade,
        classCount,
        studentCount: new Set(gradeRecords.map((fee) => fee.studentId || fee.studentEmail)).size,
        completion,
      };
    });
  }, [recordsWithLocalStatus, sections]);

  const classSummaries = useMemo(() => {
    if (!selectedGrade) {
      return [];
    }

    const classMap = new Map<string, ClassSummary>();

    sections
      .filter((section) => getGradeNumber(section.name) === selectedGrade)
      .forEach((section) => {
        const key = getClassKey(section.name);
        classMap.set(key, {
          key,
          label: getClassLabel(section.name),
          grade: selectedGrade,
          section: splitSectionName(section.name).section,
          recordCount: 0,
          studentCount: 0,
          paidCount: 0,
          pendingCount: 0,
          completion: 0,
        });
      });

    recordsWithLocalStatus
      .filter((fee) => getGradeNumber(fee.sectionName) === selectedGrade)
      .forEach((fee) => {
        const key = getClassKey(fee.sectionName);
        const current = classMap.get(key) || {
          key,
          label: getClassLabel(fee.sectionName),
          grade: selectedGrade,
          section: splitSectionName(fee.sectionName).section,
          recordCount: 0,
          studentCount: 0,
          paidCount: 0,
          pendingCount: 0,
          completion: 0,
        };

        classMap.set(key, {
          ...current,
          recordCount: current.recordCount + 1,
          paidCount: current.paidCount + (fee.status === 'Paid' ? 1 : 0),
          pendingCount: current.pendingCount + (fee.status !== 'Paid' ? 1 : 0),
        });
      });

    return Array.from(classMap.values())
      .map((classInfo) => {
        const classRecords = recordsWithLocalStatus.filter((fee) => getClassKey(fee.sectionName) === classInfo.key);
        return {
          ...classInfo,
          studentCount: new Set(classRecords.map((fee) => fee.studentId || fee.studentEmail)).size,
          completion: classRecords.length
            ? Math.round((classRecords.filter((fee) => fee.status === 'Paid').length / classRecords.length) * 100)
            : 0,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
  }, [recordsWithLocalStatus, sections, selectedGrade]);

  const visibleRecords = useMemo(() => {
    if (!staffView) {
      return recordsWithLocalStatus;
    }

    return recordsWithLocalStatus.filter((fee) => {
      const matchesGrade = !selectedGrade || getGradeNumber(fee.sectionName) === selectedGrade;
      const matchesClass = !selectedClassKey || getClassKey(fee.sectionName) === selectedClassKey;
      const matchesCategory = selectedCategory === 'All Categories' || fee.type === selectedCategory;
      const matchesStatus = selectedStatus === 'All Status' || fee.status === selectedStatus;
      return matchesGrade && matchesClass && matchesCategory && matchesStatus;
    });
  }, [recordsWithLocalStatus, selectedCategory, selectedClassKey, selectedGrade, selectedStatus, staffView]);

  const classScopedRecords = useMemo(() => {
    if (!staffView) {
      return recordsWithLocalStatus;
    }

    return recordsWithLocalStatus.filter((fee) => {
      const matchesGrade = !selectedGrade || getGradeNumber(fee.sectionName) === selectedGrade;
      const matchesClass = !selectedClassKey || getClassKey(fee.sectionName) === selectedClassKey;
      return matchesGrade && matchesClass;
    });
  }, [recordsWithLocalStatus, selectedClassKey, selectedGrade, staffView]);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...feeCategories, ...feeRecords.map((fee) => fee.type).filter(Boolean)])),
    [feeRecords]
  );

  const categorySummaries = useMemo(() => {
    return categoryOptions.map((category) => {
      const categoryRecords = category === 'All Categories'
        ? classScopedRecords
        : classScopedRecords.filter((fee) => fee.type === category);
      const completed = categoryRecords.length > 0 && categoryRecords.every((fee) => fee.status === 'Paid');
      const dueDate = category === 'All Categories'
        ? undefined
        : categoryDueDates[category] || categoryRecords[0]?.dueDate;
      const days = getDaysUntil(dueDate);
      const state: CategoryDueState = completed
        ? 'completed'
        : !dueDate
          ? 'unscheduled'
          : days !== null && days < 0
            ? 'overdue'
            : days !== null && days <= 5
              ? 'upcoming'
              : 'active';

      return {
        category,
        dueDate,
        state,
        completed,
        total: categoryRecords.length,
        pending: categoryRecords.filter((fee) => fee.status !== 'Paid').length,
        label: getDueLabel(dueDate, completed),
      };
    });
  }, [categoryDueDates, categoryOptions, classScopedRecords]);

  const selectedCategorySummary = categorySummaries.find((summary) => summary.category === selectedCategory) || categorySummaries[0];
  const selectedDueStyles = categoryStateStyles[selectedCategorySummary?.state || 'unscheduled'];

  const collectionAccuracy = recordsWithLocalStatus.length
    ? Math.round((recordsWithLocalStatus.filter((fee) => fee.status === 'Paid').length / recordsWithLocalStatus.length) * 100)
    : 0;
  const selectedClass = classSummaries.find((classInfo) => classInfo.key === selectedClassKey);
  const selectedSet = new Set(selectedRecords);
  const allVisibleSelected = visibleRecords.length > 0 && visibleRecords.every((fee) => selectedSet.has(fee.id));

  const handleSelectGrade = (grade: number) => {
    setSelectedGrade(grade);
    setSelectedClassKey(null);
    setSelectedRecords([]);
  };

  const handleSelectClass = (classKey: string) => {
    setSelectedClassKey(classKey);
    setSelectedRecords([]);
  };

  const handleMarkRecords = async (recordIds: string[], status: FeeStatus) => {
    if (!recordIds.length) {
      showToast('Select at least one student fee record first.');
      return;
    }

    try {
      await updateFeeStatuses(recordIds, status);
      await loadFees();
      setSelectedRecords([]);
      const message = `${recordIds.length} fee record${recordIds.length > 1 ? 's' : ''} marked ${status}.`;
      pushRecentAction(message);
      showToast(message);
    } catch (error) {
      console.error('Failed to update fee status:', error);
      showToast('Could not update fee status in Supabase.');
    }
  };

  const handleReminder = async (recordIds: string[]) => {
    if (!recordIds.length) {
      showToast('Select at least one student before sending reminders.');
      return;
    }

    try {
      await sendFeeReminders(recordIds);
      const message = `Reminder queued for ${recordIds.length} student${recordIds.length > 1 ? 's' : ''}.`;
      pushRecentAction(message);
      showToast('Reminder saved and notification linked in Supabase.');
      setSelectedRecords([]);
    } catch (error) {
      console.error('Failed to send fee reminder:', error);
      showToast('Could not save reminder in Supabase.');
    }
  };

  const handleSaveNote = async (recordId: string) => {
    try {
      await saveAccountantNote(recordId, notes[recordId] || '');
      pushRecentAction('Accountant note saved.');
      showToast('Accountant note saved in Supabase.');
    } catch (error) {
      console.error('Failed to save accountant note:', error);
      showToast('Could not save accountant note.');
    }
  };

  const toggleRecord = (recordId: string) => {
    setSelectedRecords((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId]
    );
  };

  const toggleAllVisible = () => {
    setSelectedRecords(allVisibleSelected ? [] : visibleRecords.map((fee) => fee.id));
  };

  if (!staffView) {
    const studentPaidTotal = feeRecords.reduce((sum, fee) => sum + Number(fee.paidAmount), 0);
    const studentPendingTotal = feeRecords.reduce((sum, fee) => sum + Number(fee.pendingAmount), 0);

    return (
      <div className="h-full space-y-5 lg:space-y-6 lg:pb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Records</h1>
          <p className="mt-1 text-slate-500">View your personal fee statements and download payment receipts.</p>
        </div>

        {notification && (
          <div className="fixed right-6 top-20 z-50 animate-in slide-in-from-right fade-in duration-300">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-xl">
              <CheckCircle size={20} className="text-emerald-400" />
              <p className="text-sm font-semibold">{notification}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm lg:rounded-2xl lg:p-6">
            <div className="rounded-xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-100 lg:p-4">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase leading-none tracking-widest text-slate-400">Total Fee Paid</p>
              <p className="break-words text-xl font-black text-slate-900 lg:text-2xl lg:font-bold">{formatCurrency(studentPaidTotal.toFixed(2))}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm lg:rounded-2xl lg:p-6">
            <div className="rounded-xl bg-amber-500 p-3 text-white shadow-lg shadow-amber-100 lg:p-4">
              <Bell size={24} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase leading-none tracking-widest text-slate-400">Pending Dues</p>
              <p className="break-words text-xl font-black text-slate-900 lg:text-2xl lg:font-bold">{formatCurrency(studentPendingTotal.toFixed(2))}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {feeRecords.map((fee) => (
            <article key={fee.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{fee.type}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">Due: {fee.dueDate}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyles[normalizeStatus(fee.status)]}`}>
                  {fee.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paid</p>
                  <p className="mt-1 text-xs font-black text-emerald-700">{formatCurrency(Number(fee.paidAmount).toFixed(2))}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending</p>
                  <p className="mt-1 text-xs font-black text-amber-700">{formatCurrency(Number(fee.pendingAmount).toFixed(2))}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total</p>
                  <p className="mt-1 text-xs font-black text-slate-900">{formatCurrency(Number(fee.totalAmount).toFixed(2))}</p>
                </div>
              </div>
              <button
                onClick={() => fee.status === 'Paid' && handleDownloadBill(fee)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-wider active:scale-[0.98] ${
                  fee.status === 'Paid'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'border border-slate-200 bg-white text-slate-500'
                }`}
              >
                {fee.status === 'Paid' ? <Download size={15} /> : <CreditCard size={15} />}
                {fee.status === 'Paid' ? 'Download Bill' : 'Pending'}
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-5 pb-8 lg:space-y-6 lg:pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Operations</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
            Manage school fee status by grade, class, student, and fee category without payment gateway steps.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3 text-white">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collection Accuracy</p>
              <p className="text-2xl font-black text-slate-900">{collectionAccuracy}%</p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed right-6 top-20 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-xl">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="text-sm font-semibold">{notification}</p>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Select Grade</h2>
            <p className="text-xs font-semibold text-slate-500">Grade 1 to Grade 12</p>
          </div>
          <GraduationCap className="text-indigo-500" size={22} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gradeSummaries.map((gradeInfo) => (
            <button
              key={gradeInfo.grade}
              onClick={() => handleSelectGrade(gradeInfo.grade)}
              className={`min-h-32 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                selectedGrade === gradeInfo.grade
                  ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                  : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <p className="text-lg font-black text-slate-900">Grade {gradeInfo.grade}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{gradeInfo.classCount || 0} classes</p>
              <div className="mt-4 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${gradeInfo.completion}%` }} />
              </div>
              <p className="mt-2 text-xs font-black text-slate-600">{gradeInfo.completion}% complete</p>
            </button>
          ))}
        </div>
      </section>

      {selectedGrade && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Select Class</h2>
              <p className="text-xs font-semibold text-slate-500">Grade {selectedGrade} sections</p>
            </div>
            <button
              onClick={() => {
                setSelectedGrade(null);
                setSelectedClassKey(null);
                setSelectedRecords([]);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Grades
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {classSummaries.map((classInfo) => (
              <button
                key={classInfo.key}
                onClick={() => handleSelectClass(classInfo.key)}
                className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                  selectedClassKey === classInfo.key
                    ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xl font-black text-slate-900">{classInfo.label}</p>
                  <Users size={18} className="text-slate-400" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Students</p>
                    <p className="text-sm font-black text-slate-900">{classInfo.studentCount}</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Paid</p>
                    <p className="text-sm font-black text-emerald-700">{classInfo.paidCount}</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Pending</p>
                    <p className="text-sm font-black text-amber-700">{classInfo.pendingCount}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${classInfo.completion}%` }} />
                </div>
              </button>
            ))}
            {classSummaries.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-sm font-bold text-slate-400">
                No classes found for Grade {selectedGrade}.
              </div>
            )}
          </div>
        </section>
      )}

      {selectedClassKey && (
        <section className={`overflow-hidden rounded-2xl border shadow-sm transition-colors duration-300 ${selectedDueStyles.panel}`}>
          <div className="border-b border-white/70 p-4 lg:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedClass?.label || 'Class'} Fee Workspace</h2>
                <p className="text-xs font-semibold text-slate-500">Choose category, select students, and update fee status quickly.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                  <CheckSquare size={14} />
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  >
                    {statusFilters.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={toggleAllVisible}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  {allVisibleSelected ? 'Clear Selection' : 'Select Visible'}
                </button>
                <button
                  onClick={() => handleReminder(selectedRecords)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                >
                  <Send size={14} /> Bulk Reminder
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Filter size={14} /> Fee Category
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {categorySummaries.map((summary) => {
                    const isActive = summary.category === selectedCategory;
                    const styles = categoryStateStyles[summary.state];
                    return (
                      <button
                        key={summary.category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(summary.category);
                          setSelectedRecords([]);
                        }}
                        className={`rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98] ${
                          isActive ? `${styles.badge} shadow-sm ring-2 ring-white` : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-sm font-black text-slate-900">{summary.category}</p>
                          {summary.state !== 'unscheduled' && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${styles.badge}`}>
                              {summary.state}
                            </span>
                          )}
                        </div>
                        <p className={`mt-2 text-xs font-black ${styles.accent}`}>{summary.label}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">{summary.total} records - {summary.pending} pending</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 shadow-sm transition-colors duration-300 ${selectedDueStyles.badge}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-75">Selected Deadline</p>
                    <h3 className="mt-1 break-words text-lg font-black text-slate-900">{selectedCategory}</h3>
                    <p className={`mt-1 text-sm font-black ${selectedDueStyles.accent}`}>
                      {formatDueDate(selectedCategorySummary?.dueDate)}
                    </p>
                    <p className="mt-1 text-xs font-bold opacity-80">{selectedCategorySummary?.label || 'No deadline'}</p>
                  </div>
                  <CalendarDays size={22} className={selectedDueStyles.accent} />
                </div>
                {selectedCategory !== 'All Categories' && (
                  <label className="mt-4 block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest opacity-75">Edit Due Date</span>
                    <input
                      type="date"
                      value={categoryDueDates[selectedCategory] || ''}
                      onChange={(event) => {
                        setCategoryDueDates((current) => ({ ...current, [selectedCategory]: event.target.value }));
                        pushRecentAction(`${selectedCategory} due date updated.`);
                      }}
                      className="w-full rounded-xl border border-white/80 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition-all focus:ring-2 focus:ring-white"
                    />
                  </label>
                )}
              </div>
            </div>

            {selectedRecords.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-3">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-700">{selectedRecords.length} selected</span>
                <button onClick={() => handleMarkRecords(selectedRecords, 'Paid')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Mark Paid</button>
                <button onClick={() => handleMarkRecords(selectedRecords, 'Pending')} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white">Mark Pending</button>
                <button onClick={() => handleMarkRecords(selectedRecords, 'Partial')} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white">Mark Partial</button>
                <button onClick={() => setSelectedRecords([])} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Reject Selection</button>
              </div>
            )}
          </div>

          <div className="grid gap-3 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleRecords.map((fee) => {
              const status = normalizeStatus(fee.status);
              const isSelected = selectedSet.has(fee.id);
              const feeCategorySummary = categorySummaries.find((summary) => summary.category === fee.type);
              const cardDueDate = categoryDueDates[fee.type] || fee.dueDate;
              const cardDueState = status === 'Paid' ? 'completed' : feeCategorySummary?.state || selectedCategorySummary?.state || 'unscheduled';
              const cardStyles = categoryStateStyles[cardDueState];
              const note = Object.prototype.hasOwnProperty.call(notes, fee.id)
                ? notes[fee.id]
                : status === 'Paid'
                  ? ''
                  : `Remaining ${formatCurrency(Number(fee.pendingAmount).toFixed(2))}`;

              return (
                <article
                  key={fee.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 ${
                    isSelected ? 'border-indigo-300 bg-white ring-2 ring-indigo-100' : cardStyles.card
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRecord(fee.id)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                      />
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-black text-slate-900">{fee.studentName || fee.studentEmail}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">Roll {fee.rollNo || '-'} - {getClassLabel(fee.sectionName)}</p>
                      </div>
                    </label>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyles[status]}`}>
                        {status}
                      </span>
                      {cardDueState === 'overdue' && status !== 'Paid' && (
                        <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-indigo-500" />
                        <p className="text-sm font-black text-slate-900">{fee.type}</p>
                      </div>
                      <p className={`text-xs font-black ${cardStyles.accent}`}>Due {formatDueDate(cardDueDate)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Paid</p>
                        <p className="text-xs font-black text-emerald-700">{formatCurrency(Number(fee.paidAmount).toFixed(2))}</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Pending</p>
                        <p className="text-xs font-black text-amber-700">{formatCurrency(Number(fee.pendingAmount).toFixed(2))}</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                        <p className="text-xs font-black text-slate-900">{formatCurrency(Number(fee.totalAmount).toFixed(2))}</p>
                      </div>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                      <Edit3 size={13} /> Pending Note
                    </span>
                    <textarea
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [fee.id]: event.target.value }))}
                      onBlur={() => void handleSaveNote(fee.id)}
                      rows={2}
                      placeholder="Add pending note"
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => handleMarkRecords([fee.id], 'Paid')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Paid</button>
                    <button onClick={() => handleMarkRecords([fee.id], 'Pending')} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white">Pending</button>
                    <button onClick={() => handleMarkRecords([fee.id], 'Partial')} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white">Partial</button>
                    <button onClick={() => handleReminder([fee.id])} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                      <MessageSquare size={14} /> Reminder
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleRecords.length === 0 && (
              <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm font-bold text-slate-400 md:col-span-2 xl:col-span-3">
                No student fee records match this class and filter.
              </div>
            )}
          </div>
        </section>
      )}

      {recentActions.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bell size={16} className="text-indigo-500" />
            <h2 className="text-sm font-black text-slate-900">Recent Actions</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {recentActions.map((action, index) => (
              <div key={`${action}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                {action}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FinanceDashboard;
