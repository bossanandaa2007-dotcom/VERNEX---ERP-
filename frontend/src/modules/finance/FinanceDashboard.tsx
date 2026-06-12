import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
  IndianRupee,
  Megaphone,
  MessageSquare,
  Save,
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
  setStandardTermFee,
  updateFeeCategoryDueDate,
  updateFeeStatuses,
  type FeeRecord,
} from '../../services/erpContent';

type FeeStatus = 'Paid' | 'Pending' | 'Partial';
type CategoryDueState = 'active' | 'upcoming' | 'overdue' | 'completed' | 'unscheduled';
type PartialPaymentDialog = {
  recordIds: string[];
  amount: string;
} | null;
type TermFeeForm = {
  standard: string;
  term: 'Term 1' | 'Term 2' | 'Term 3';
  amount: string;
  dueDate: string;
  message: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};
type PaymentDraft = {
  paidAmount: string;
};

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

const feeCategories = ['All Categories', 'Term 1 Fee', 'Term 2 Fee', 'Term 3 Fee'];
const statusFilters = ['All Status', 'Paid', 'Partial', 'Pending'];
const dueDateStorageKey = 'vernex-accountant-category-due-dates';
const termOptions: TermFeeForm['term'][] = ['Term 1', 'Term 2', 'Term 3'];

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
  if (status === 'Paid') {
    return 'Paid';
  }
  if (status === 'Partial') {
    return 'Partial';
  }
  return 'Pending';
};

const statusStyles: Record<FeeStatus, string> = {
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Partial: 'border-sky-200 bg-sky-50 text-sky-700',
};

const getStatusLabel = (status: FeeStatus) => status === 'Pending' ? 'Not Paid' : status;

const sanitizeNumericInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integerPart, ...decimalParts] = cleaned.split('.');
  if (!decimalParts.length) {
    return integerPart;
  }
  return `${integerPart}.${decimalParts.join('')}`;
};

const formatIndianNumberInput = (value: string) => {
  if (!value) {
    return '';
  }

  const sanitized = sanitizeNumericInput(value);
  if (!sanitized) {
    return '';
  }

  const endsWithDecimal = sanitized.endsWith('.');
  const [integerPart = '0', decimalPart] = sanitized.split('.');
  const formattedInteger = new Intl.NumberFormat('en-IN').format(Number(integerPart || '0'));

  if (endsWithDecimal) {
    return `${formattedInteger}.`;
  }

  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
};

const parseFormattedNumber = (value: string) => Number(sanitizeNumericInput(value));

const clampCurrencyInput = (value: string, maxAmount: number) => {
  const sanitized = sanitizeNumericInput(value);
  if (!sanitized) {
    return '';
  }

  const numericValue = Number(sanitized);
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  const clampedValue = Math.min(Math.max(numericValue, 0), maxAmount);
  return String(clampedValue);
};

const getAutoPaymentStatus = (paidAmount: number, totalAmount: number): FeeStatus => {
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return 'Pending';
  }

  if (paidAmount >= totalAmount) {
    return 'Paid';
  }

  return 'Partial';
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
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});
  const [partialPaymentDialog, setPartialPaymentDialog] = useState<PartialPaymentDialog>(null);
  const [isAssigningTermFee, setIsAssigningTermFee] = useState(false);
  const [termFeeForm, setTermFeeForm] = useState<TermFeeForm>({
    standard: '',
    term: 'Term 1',
    amount: '',
    dueDate: '',
    message: '',
  });
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
    doc.text('VerneX ERP - Fee Receipt', 14, 25);

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

  const canManageFees = user?.role === 'Accountant';
  const staffView = user?.role === 'Admin' || canManageFees;

  const recordsWithLocalStatus = useMemo(
    () => feeRecords.map((fee) => ({ ...fee, status: normalizeStatus(fee.status) })),
    [feeRecords]
  );

  useEffect(() => {
    if (!recordsWithLocalStatus.length) {
      return;
    }

      setPaymentDrafts(Object.fromEntries(recordsWithLocalStatus.map((fee) => [
        fee.id,
        {
          paidAmount: String(Number(fee.paidAmount || 0)),
        },
      ])));

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
      return recordsWithLocalStatus.slice().sort((left, right) => {
        const classCompare = getClassLabel(left.sectionName).localeCompare(getClassLabel(right.sectionName), undefined, { numeric: true });
        if (classCompare !== 0) {
          return classCompare;
        }

        const rollCompare = String(left.rollNo || '').localeCompare(String(right.rollNo || ''), undefined, { numeric: true });
        if (rollCompare !== 0) {
          return rollCompare;
        }

        return String(left.studentName || left.studentEmail || '').localeCompare(String(right.studentName || right.studentEmail || ''), undefined, { numeric: true });
      });
    }

    return recordsWithLocalStatus.filter((fee) => {
      const matchesGrade = !selectedGrade || getGradeNumber(fee.sectionName) === selectedGrade;
      const matchesClass = !selectedClassKey || getClassKey(fee.sectionName) === selectedClassKey;
      const matchesCategory = selectedCategory === 'All Categories' || fee.type === selectedCategory;
      const matchesStatus = selectedStatus === 'All Status' || fee.status === selectedStatus;
      return matchesGrade && matchesClass && matchesCategory && matchesStatus;
    }).sort((left, right) => {
      const classCompare = getClassLabel(left.sectionName).localeCompare(getClassLabel(right.sectionName), undefined, { numeric: true });
      if (classCompare !== 0) {
        return classCompare;
      }

      const rollCompare = String(left.rollNo || '').localeCompare(String(right.rollNo || ''), undefined, { numeric: true });
      if (rollCompare !== 0) {
        return rollCompare;
      }

      return String(left.studentName || left.studentEmail || '').localeCompare(String(right.studentName || right.studentEmail || ''), undefined, { numeric: true });
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
  const availableStandards = useMemo(() => {
    const standards = new Set<number>();

    sections.forEach((section) => {
      const grade = getGradeNumber(section.name);
      if (grade >= 1 && grade <= 12) {
        standards.add(grade);
      }
    });

    recordsWithLocalStatus.forEach((fee) => {
      const grade = getGradeNumber(fee.sectionName);
      if (grade >= 1 && grade <= 12) {
        standards.add(grade);
      }
    });

    return Array.from(standards).sort((left, right) => left - right);
  }, [recordsWithLocalStatus, sections]);

  const handleSelectGrade = (grade: number) => {
    setSelectedGrade(grade);
    setSelectedClassKey(null);
    setSelectedRecords([]);
  };

  const handleSelectClass = (classKey: string) => {
    setSelectedClassKey(classKey);
    setSelectedRecords([]);
  };

  const handleAssignTermFee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageFees) {
      showToast('Admin has read-only access to fee operations.');
      return;
    }

    const standard = Number(termFeeForm.standard);
    const amount = Number(termFeeForm.amount);

    if (!Number.isInteger(standard) || standard < 1 || standard > 12) {
      showToast('Choose a valid standard.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a valid fee amount.');
      return;
    }

    if (!termFeeForm.dueDate) {
      showToast('Choose a due date.');
      return;
    }

    try {
      setIsAssigningTermFee(true);
      const studentCount = await setStandardTermFee({
        standard,
        term: termFeeForm.term,
        amount,
        dueDate: termFeeForm.dueDate,
        message: termFeeForm.message.trim() || undefined,
      });
      await loadFees();
      setSelectedGrade(standard);
      setSelectedClassKey(null);
      setSelectedCategory(`${termFeeForm.term} Fee`);
      setCategoryDueDates((current) => ({ ...current, [`${termFeeForm.term} Fee`]: termFeeForm.dueDate }));
      setTermFeeForm((current) => ({ ...current, amount: '', message: '' }));
      const message = `${termFeeForm.term} fee assigned to ${studentCount} student${studentCount === 1 ? '' : 's'} in Standard ${standard}.`;
      pushRecentAction(message);
      showToast(message);
    } catch (error) {
      console.error('Failed to assign standard term fee:', error);
      showToast('Could not assign term fee in Supabase.');
    } finally {
      setIsAssigningTermFee(false);
    }
  };

  const handleMarkRecords = async (recordIds: string[], status: FeeStatus, partialPaidAmount?: number) => {
    if (!canManageFees) {
      showToast('Admin has read-only access to fee operations.');
      return false;
    }

    if (!recordIds.length) {
      showToast('Select at least one student fee record first.');
      return false;
    }

    try {
      await updateFeeStatuses(recordIds, status, partialPaidAmount);
      await loadFees();
      setSelectedRecords([]);
      const message = status === 'Partial'
        ? `${recordIds.length} partial payment${recordIds.length > 1 ? 's' : ''} saved as pending.`
        : `${recordIds.length} fee record${recordIds.length > 1 ? 's' : ''} marked ${status}.`;
      pushRecentAction(message);
      showToast(message);
      return true;
    } catch (error) {
      console.error('Failed to update fee status:', error);
      showToast('Could not update fee status in Supabase.');
      return false;
    }
  };

  const updatePaymentDraft = (recordId: string, updates: Partial<PaymentDraft>) => {
    if (!canManageFees) {
      return;
    }

    setPaymentDrafts((current) => {
      const fee = recordsWithLocalStatus.find((record) => record.id === recordId);
      const existing = current[recordId] || {
        paidAmount: String(Number(fee?.paidAmount || 0)),
      };

      return {
        ...current,
        [recordId]: {
          ...existing,
          ...updates,
        },
      };
    });
  };

  const savePaymentDrafts = async (recordIds: string[]) => {
    if (!canManageFees) {
      showToast('Admin has read-only access to fee operations.');
      return false;
    }

    if (!recordIds.length) {
      showToast('Select at least one student fee record first.');
      return false;
    }

    try {
      for (const recordId of recordIds) {
        const fee = recordsWithLocalStatus.find((record) => record.id === recordId);
        const draft = paymentDrafts[recordId];

        if (!fee || !draft) {
          continue;
        }

        const paidAmount = parseFormattedNumber(draft.paidAmount);
        if (!Number.isFinite(paidAmount) || paidAmount < 0) {
          throw new Error(`Invalid paid amount for ${fee.studentName || fee.studentEmail}.`);
        }

        if (paidAmount > Number(fee.totalAmount)) {
          throw new Error(`Paid amount for ${fee.studentName || fee.studentEmail} cannot exceed total fee.`);
        }

        const autoStatus = getAutoPaymentStatus(paidAmount, Number(fee.totalAmount));

        if (autoStatus === 'Partial') {
          if (paidAmount <= 0 || paidAmount >= Number(fee.totalAmount)) {
            throw new Error(`Partial amount for ${fee.studentName || fee.studentEmail} must be greater than 0 and less than total fee.`);
          }
          await updateFeeStatuses([recordId], 'Partial', paidAmount);
        } else if (autoStatus === 'Paid') {
          await updateFeeStatuses([recordId], 'Paid');
        } else {
          await updateFeeStatuses([recordId], 'Pending');
        }
      }

      await loadFees();
      pushRecentAction(`${recordIds.length} payment update${recordIds.length === 1 ? '' : 's'} saved.`);
      showToast('Payment details saved in Supabase.');
      return true;
    } catch (error: unknown) {
      console.error('Failed to save payment details:', error);
      showToast(getErrorMessage(error, 'Could not save payment details.'));
      return false;
    }
  };

  const handleConfirmPartialPayment = async () => {
    if (!partialPaymentDialog) {
      return;
    }

    const paidAmount = parseFormattedNumber(partialPaymentDialog.amount);
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      showToast('Enter a valid paid amount.');
      return;
    }

    const saved = await handleMarkRecords(partialPaymentDialog.recordIds, 'Partial', paidAmount);
    if (saved) {
      setPartialPaymentDialog(null);
    }
  };

  const handleReminder = async (recordIds: string[]) => {
    if (!canManageFees) {
      showToast('Admin has read-only access to fee operations.');
      return;
    }

    if (!recordIds.length) {
      showToast('Select at least one student before sending reminders.');
      return;
    }

    try {
      const saved = await savePaymentDrafts(recordIds);
      if (!saved) {
        return;
      }

      const refreshedRecords = await fetchFeeRecords(user?.role === 'Student' ? user.email : undefined);
      setFeeRecords(refreshedRecords);
      const normalizedRefreshedRecords = refreshedRecords.map((fee) => ({ ...fee, status: normalizeStatus(fee.status) }));
      const targetRecords = normalizedRefreshedRecords.filter((fee) => recordIds.includes(fee.id) && fee.status !== 'Paid');
      const unpaidRecordIds = targetRecords.filter((fee) => Number(fee.paidAmount) <= 0).map((fee) => fee.id);
      const partialRecordIds = targetRecords.filter((fee) => Number(fee.paidAmount) > 0).map((fee) => fee.id);

      if (unpaidRecordIds.length) {
        await sendFeeReminders(unpaidRecordIds, 'High priority reminder: the full fee amount is still pending. Please complete payment before the due date.');
      }

      if (partialRecordIds.length) {
        await sendFeeReminders(partialRecordIds, 'Balance reminder: your partial payment is recorded. Please clear the remaining amount before the due date.');
      }

      const skippedPaid = recordIds.length - targetRecords.length;
      const message = `Reminder queued for ${targetRecords.length} pending student${targetRecords.length === 1 ? '' : 's'}${skippedPaid ? `; ${skippedPaid} paid record${skippedPaid === 1 ? '' : 's'} skipped` : ''}.`;
      pushRecentAction(message);
      showToast('Reminder saved and notification linked in Supabase.');
      setSelectedRecords([]);
    } catch (error) {
      console.error('Failed to send fee reminder:', error);
      showToast('Could not save reminder in Supabase.');
    }
  };

  const handleSaveNote = async (recordId: string) => {
    if (!canManageFees) {
      return;
    }

    try {
      await saveAccountantNote(recordId, notes[recordId] || '');
      pushRecentAction('Accountant note saved.');
      showToast('Accountant note saved in Supabase.');
    } catch (error) {
      console.error('Failed to save accountant note:', error);
      showToast('Could not save accountant note.');
    }
  };

  const handlePersistDueDate = async (category: string, dueDate: string) => {
    if (!canManageFees) {
      return;
    }

    if (!dueDate || category === 'All Categories') {
      return;
    }

    try {
      const scopedRecordIds = classScopedRecords
        .filter((fee) => fee.type === category)
        .map((fee) => fee.id);

      await updateFeeCategoryDueDate(category, dueDate, scopedRecordIds);
      await loadFees();
      pushRecentAction(`${category} due date saved.`);
      showToast('Due date saved in Supabase.');
    } catch (error) {
      console.error('Failed to update due date:', error);
      showToast('Could not save due date in Supabase.');
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
                  {getStatusLabel(normalizeStatus(fee.status))}
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Accountant Workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Fee Operations</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              {canManageFees
                ? 'Manage fee status by grade, class, student, and fee category without payment gateway steps.'
                : 'View accountant fee assignments, payment updates, reminders, and student status without editing access.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Accuracy</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{collectionAccuracy}%</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Grades</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{gradeSummaries.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Students</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{recordsWithLocalStatus.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Open Dues</p>
              <p className="mt-1 text-lg font-bold text-amber-700">{recordsWithLocalStatus.filter((fee) => fee.status !== 'Paid').length}</p>
            </div>
          </div>
        </div>
      </section>

      {notification && (
        <div className="fixed right-6 top-20 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-xl">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="text-sm font-semibold">{notification}</p>
          </div>
        </div>
      )}

      {!canManageFees && (
        <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Admin read-only finance view</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                Fee amounts, payment statuses, notes, and reminders shown here are maintained by the accountant. Admin can review them but cannot alter fees or remind students.
              </p>
            </div>
          </div>
        </section>
      )}

      {canManageFees && (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-teal-100 bg-teal-50 p-4 text-slate-950 sm:p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white p-3 text-teal-700 shadow-sm ring-1 ring-teal-100">
                <Megaphone size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Standard Fee Setup</p>
                <h2 className="mt-1 text-lg font-semibold sm:text-xl">Assign Term Fee</h2>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-600 lg:max-w-md">
              Set Term 1, Term 2, or Term 3 for a full standard. Standard 3 automatically covers 3-A, 3-B, and 3-C students and creates student notifications.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">
                <p className="font-semibold text-slate-950">{availableStandards.length}</p>
                <p className="mt-1 font-semibold text-slate-500">Standards available</p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-white p-3 shadow-sm">
                <p className="font-semibold text-slate-950">{recordsWithLocalStatus.filter((fee) => fee.status !== 'Paid').length}</p>
                <p className="mt-1 font-semibold text-slate-500">Open dues</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAssignTermFee} className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Standard</span>
                <select
                  value={termFeeForm.standard}
                  onChange={(event) => setTermFeeForm((current) => ({ ...current, standard: event.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select</option>
                  {availableStandards.map((standard) => (
                    <option key={standard} value={standard}>Standard {standard}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Term</span>
                <select
                  value={termFeeForm.term}
                  onChange={(event) => setTermFeeForm((current) => ({ ...current, term: event.target.value as TermFeeForm['term'] }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  {termOptions.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Amount</span>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatIndianNumberInput(termFeeForm.amount)}
                    onChange={(event) => setTermFeeForm((current) => ({ ...current, amount: sanitizeNumericInput(event.target.value) }))}
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 pl-9 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Due Date</span>
                <input
                  type="date"
                  value={termFeeForm.dueDate}
                  onChange={(event) => setTermFeeForm((current) => ({ ...current, dueDate: event.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Reminder Message</span>
                <textarea
                  value={termFeeForm.message}
                  onChange={(event) => setTermFeeForm((current) => ({ ...current, message: event.target.value }))}
                  rows={2}
                  placeholder="Optional message for students and parents"
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <button
                type="submit"
                disabled={isAssigningTermFee}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 xl:min-w-44"
              >
                <Send size={16} />
                {isAssigningTermFee ? 'Assigning...' : 'Assign & Notify'}
              </button>
            </div>
          </form>
        </div>
      </section>
      )}

      <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${
        selectedGrade ? 'hidden md:block' : ''
      }`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Select Grade</h2>
            <p className="text-xs font-semibold text-slate-500">Grade 1 to Grade 12</p>
          </div>
          <GraduationCap className="text-indigo-500" size={22} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {gradeSummaries.map((gradeInfo) => (
            <button
              key={gradeInfo.grade}
              onClick={() => handleSelectGrade(gradeInfo.grade)}
              className={`min-h-32 rounded-lg border p-4 text-left transition-all active:scale-[0.98] ${
                selectedGrade === gradeInfo.grade
                  ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                  : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
              }`}
            >
              <p className="text-base font-semibold text-slate-900">Grade {gradeInfo.grade}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{gradeInfo.classCount || 0} classes</p>
              <div className="mt-4 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${gradeInfo.completion}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-600">{gradeInfo.completion}% complete</p>
            </button>
          ))}
        </div>
      </section>

      {selectedGrade && (
        <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${
          selectedClassKey ? 'hidden md:block' : ''
        }`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Select Class</h2>
              <p className="text-xs font-semibold text-slate-500">Grade {selectedGrade} sections</p>
            </div>
            <button
              onClick={() => {
                setSelectedGrade(null);
                setSelectedClassKey(null);
                setSelectedRecords([]);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Grades
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {classSummaries.map((classInfo) => (
              <button
                key={classInfo.key}
                onClick={() => handleSelectClass(classInfo.key)}
                className={`rounded-lg border p-4 text-left transition-all active:scale-[0.98] ${
                  selectedClassKey === classInfo.key
                    ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold text-slate-900">{classInfo.label}</p>
                  <Users size={18} className="text-slate-400" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Students</p>
                    <p className="text-sm font-semibold text-slate-900">{classInfo.studentCount}</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Paid</p>
                    <p className="text-sm font-semibold text-emerald-700">{classInfo.paidCount}</p>
                  </div>
                  <div className="rounded-xl bg-white px-2 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
                    <p className="text-sm font-semibold text-amber-700">{classInfo.pendingCount}</p>
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
            <button
              type="button"
              onClick={() => {
                setSelectedClassKey(null);
                setSelectedRecords([]);
              }}
              className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 md:hidden"
            >
              <ArrowLeft size={14} /> Classes
            </button>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedClass?.label || 'Class'} Fee Workspace</h2>
                <p className="text-xs font-semibold text-slate-500">Choose category, select students, and update fee status quickly.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
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
                {canManageFees && (
                  <>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                      />
                      <span>Select All Students</span>
                    </label>
                    <button
                      onClick={toggleAllVisible}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {allVisibleSelected ? 'Clear Selection' : 'Select All Students'}
                    </button>
                    <button
                      onClick={() => handleReminder(selectedRecords)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                    >
                      <Send size={14} /> Bulk Reminder
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                          <p className="min-w-0 break-words text-sm font-semibold text-slate-900">{summary.category}</p>
                          {summary.state !== 'unscheduled' && (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${styles.badge}`}>
                              {summary.state}
                            </span>
                          )}
                        </div>
                        <p className={`mt-2 text-xs font-semibold ${styles.accent}`}>{summary.label}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-500">{summary.total} records - {summary.pending} pending</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 shadow-sm transition-colors duration-300 ${selectedDueStyles.badge}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-75">Selected Deadline</p>
                    <h3 className="mt-1 break-words text-base font-semibold text-slate-900">{selectedCategory}</h3>
                    <p className={`mt-1 text-sm font-semibold ${selectedDueStyles.accent}`}>
                      {formatDueDate(selectedCategorySummary?.dueDate)}
                    </p>
                    <p className="mt-1 text-xs font-bold opacity-80">{selectedCategorySummary?.label || 'No deadline'}</p>
                  </div>
                  <CalendarDays size={22} className={selectedDueStyles.accent} />
                </div>
                {canManageFees && selectedCategory !== 'All Categories' && (
                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] opacity-75">Edit Due Date</span>
                    <input
                      type="date"
                      value={categoryDueDates[selectedCategory] || ''}
                      onChange={(event) => {
                        setCategoryDueDates((current) => ({ ...current, [selectedCategory]: event.target.value }));
                        pushRecentAction(`${selectedCategory} due date updated.`);
                      }}
                      onBlur={() => void handlePersistDueDate(selectedCategory, categoryDueDates[selectedCategory] || '')}
                      className="w-full rounded-lg border border-white/80 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all focus:ring-2 focus:ring-white"
                    />
                  </label>
                )}
              </div>
            </div>

            {canManageFees && selectedRecords.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">{selectedRecords.length} selected</span>
                <button onClick={() => savePaymentDrafts(selectedRecords)} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Save size={14} /> Save Payments</button>
                <button onClick={() => handleMarkRecords(selectedRecords, 'Paid')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Mark Paid</button>
                <button onClick={() => handleMarkRecords(selectedRecords, 'Pending')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">Mark Not Paid</button>
                <button onClick={() => setSelectedRecords([])} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Reject Selection</button>
              </div>
            )}
          </div>

          <div className="grid gap-3 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleRecords.map((fee) => {
              const savedStatus = normalizeStatus(fee.status);
              const draft = paymentDrafts[fee.id] || {
                paidAmount: String(Number(fee.paidAmount || 0)),
              };
              const isSelected = selectedSet.has(fee.id);
              const feeCategorySummary = categorySummaries.find((summary) => summary.category === fee.type);
              const cardDueDate = categoryDueDates[fee.type] || fee.dueDate;
               const cardDueState = savedStatus === 'Paid' ? 'completed' : feeCategorySummary?.state || selectedCategorySummary?.state || 'unscheduled';
               const cardStyles = categoryStateStyles[cardDueState];
               const note = Object.prototype.hasOwnProperty.call(notes, fee.id)
                 ? notes[fee.id]
                 : savedStatus === 'Paid'
                   ? ''
                   : `Remaining ${formatCurrency(Number(fee.pendingAmount).toFixed(2))}`;
               const reminderLevel = savedStatus === 'Pending'
                 ? {
                     label: 'High reminder',
                     className: 'border-rose-200 bg-rose-50 text-rose-700',
                     message: 'Full amount pending',
                   }
                 : savedStatus === 'Partial'
                   ? {
                       label: 'Balance reminder',
                       className: 'border-sky-200 bg-sky-50 text-sky-700',
                       message: 'Partial payment received',
                    }
                  : null;

              return (
                <article
                  key={fee.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 ${
                    isSelected ? 'border-indigo-300 bg-white ring-2 ring-indigo-100' : cardStyles.card
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 cursor-pointer items-start gap-3">
                      {canManageFees && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecord(fee.id)}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                        />
                      )}
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold text-slate-900">{fee.studentName || fee.studentEmail}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">Roll {fee.rollNo || '-'} - {getClassLabel(fee.sectionName)}</p>
                      </div>
                    </label>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusStyles[savedStatus]}`}>
                        {getStatusLabel(savedStatus)}
                      </span>
                      {cardDueState === 'overdue' && savedStatus !== 'Paid' && (
                        <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {reminderLevel && (
                    <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${reminderLevel.className}`}>
                      <AlertTriangle size={14} />
                      <span>{reminderLevel.label}</span>
                      <span className="font-semibold opacity-80">- {reminderLevel.message}</span>
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-indigo-500" />
                        <p className="text-sm font-semibold text-slate-900">{fee.type}</p>
                      </div>
                      <p className={`text-xs font-semibold ${cardStyles.accent}`}>Due {formatDueDate(cardDueDate)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Paid</p>
                        <p className="text-xs font-semibold text-emerald-700">{formatCurrency(Number(fee.paidAmount).toFixed(2))}</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
                        <p className="text-xs font-semibold text-amber-700">{formatCurrency(Number(fee.pendingAmount).toFixed(2))}</p>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
                        <p className="text-xs font-semibold text-slate-900">{formatCurrency(Number(fee.totalAmount).toFixed(2))}</p>
                      </div>
                    </div>
                  </div>

                  {canManageFees && (
                    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <IndianRupee size={13} /> Payment Entry
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_0.9fr]">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Amount Paid</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatIndianNumberInput(draft.paidAmount)}
                            onChange={(event) => updatePaymentDraft(fee.id, {
                              paidAmount: clampCurrencyInput(event.target.value, Number(fee.totalAmount)),
                            })}
                            disabled={!canManageFees}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                        <div className="block">
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status</span>
                          <div className={`flex h-[42px] items-center rounded-lg border px-3 py-2 text-sm font-semibold ${
                            savedStatus === 'Paid'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : savedStatus === 'Partial'
                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}>
                            {getStatusLabel(savedStatus)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => savePaymentDrafts([fee.id])}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Save size={14} /> Save Payment Info
                      </button>
                    </div>
                  )}

                  <label className="mt-4 block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Edit3 size={13} /> Pending Note
                    </span>
                    <textarea
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [fee.id]: event.target.value }))}
                      onBlur={() => void handleSaveNote(fee.id)}
                      disabled={!canManageFees}
                      rows={2}
                      placeholder={canManageFees ? 'Add pending note' : 'View pending note'}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  {canManageFees && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button onClick={() => handleMarkRecords([fee.id], 'Paid')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Paid</button>
                      <button onClick={() => updatePaymentDraft(fee.id, { paidAmount: '0' })} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">Not Paid</button>
                      <button onClick={() => handleReminder([fee.id])} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                        <MessageSquare size={14} /> Reminder
                      </button>
                    </div>
                  )}
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
            <h2 className="text-sm font-semibold text-slate-900">Recent Actions</h2>
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

      {partialPaymentDialog && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Partial Payment</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Enter the paid amount. The remaining balance will stay pending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPartialPaymentDialog(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Paid Amount</span>
              <input
                type="text"
                inputMode="decimal"
                value={formatIndianNumberInput(partialPaymentDialog.amount)}
                onChange={(event) => setPartialPaymentDialog((current) =>
                  current ? { ...current, amount: sanitizeNumericInput(event.target.value) } : current
                )}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Enter amount paid"
                autoFocus
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPartialPaymentDialog(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmPartialPayment()}
                className="rounded-lg bg-sky-600 px-4 py-3 text-xs font-semibold text-white shadow-sm"
              >
                Save Partial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
