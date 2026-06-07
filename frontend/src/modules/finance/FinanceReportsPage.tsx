import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, GraduationCap, IndianRupee, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useClassStore } from '../../store/useClassStore';
import { fetchFeeRecords, type FeeRecord } from '../../services/erpContent';
import { formatCurrency } from '../../utils/formatCurrency';

const extractRollValue = (rollNo?: string) => {
  if (!rollNo) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = String(rollNo).match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatGeneratedAt = (value: Date) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);

const normalizeClassName = (value?: string) => value?.trim() || 'Unassigned';
const getStudentKey = (record: FeeRecord) =>
  record.studentId || record.studentEmail || record.rollNo || record.studentName || record.id;
const normalizeStatus = (status?: string) => {
  if (status === 'Paid') {
    return 'Paid';
  }
  if (status === 'Partial') {
    return 'Partial';
  }
  return 'Not Paid';
};

const FinanceReportsPage = () => {
  const initializeSchoolData = useClassStore((state) => state.initialize);
  const sections = useClassStore((state) => state.sections);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [generatedClassName, setGeneratedClassName] = useState('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void initializeSchoolData();
  }, [initializeSchoolData]);

  useEffect(() => {
    const loadFeeRecords = async () => {
      try {
        setIsLoading(true);
        const records = await fetchFeeRecords();
        setFeeRecords(records);
      } catch (error) {
        console.error('Failed to load fee report records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeeRecords();
  }, []);

  const classOptions = useMemo(
    () => Array.from(
      new Map(
        [
          ...sections.map((section) => normalizeClassName(section.name)),
          ...feeRecords.map((record) => normalizeClassName(record.sectionName)),
        ]
          .filter(Boolean)
          .sort((left, right) => {
            const leftRoll = extractRollValue(left);
            const rightRoll = extractRollValue(right);
            if (leftRoll !== rightRoll) {
              return leftRoll - rightRoll;
            }
            return left.localeCompare(right);
          })
          .map((name) => [name, name]),
      ).values(),
    ),
    [feeRecords, sections],
  );

  const activeClassName = generatedClassName || selectedClassName;
  const classRecords = useMemo(
    () => feeRecords
      .filter((record) => normalizeClassName(record.sectionName) === activeClassName)
      .sort((left, right) => {
        const leftRoll = extractRollValue(left.rollNo);
        const rightRoll = extractRollValue(right.rollNo);
        if (leftRoll !== rightRoll) {
          return leftRoll - rightRoll;
        }

        const rollCompare = String(left.rollNo || '').localeCompare(String(right.rollNo || ''), undefined, { numeric: true });
        if (rollCompare !== 0) {
          return rollCompare;
        }

        const nameCompare = String(left.studentName || '').localeCompare(String(right.studentName || ''));
        if (nameCompare !== 0) {
          return nameCompare;
        }

        return String(left.type || '').localeCompare(String(right.type || ''));
      }),
    [activeClassName, feeRecords],
  );

  const reportRows = useMemo(
    () => classRecords.map((record, index) => ({
      serial: index + 1,
      rollNo: record.rollNo || '-',
      studentName: record.studentName || 'Unnamed Student',
      sectionName: record.sectionName || activeClassName || '-',
      feeType: record.type || '-',
      dueDate: formatDate(record.dueDate),
      totalAmount: formatCurrency(record.totalAmount),
      paidAmount: formatCurrency(record.paidAmount),
      pendingAmount: formatCurrency(record.pendingAmount),
      status: normalizeStatus(record.status),
      note: record.latestNote?.trim() || '-',
    })),
    [activeClassName, classRecords],
  );

  const totals = useMemo(
    () => {
      const studentMap = new Map<string, {
        hasPaid: boolean;
        hasPartial: boolean;
        hasPendingBalance: boolean;
        allPaid: boolean;
      }>();

      const summary = classRecords.reduce(
        (currentSummary, record) => {
          currentSummary.totalAmount += Number(record.totalAmount || 0);
          currentSummary.paidAmount += Number(record.paidAmount || 0);
          currentSummary.pendingAmount += Number(record.pendingAmount || 0);

          const key = getStudentKey(record);
          const existing = studentMap.get(key) || {
            hasPaid: false,
            hasPartial: false,
            hasPendingBalance: false,
            allPaid: true,
          };
          const status = normalizeStatus(record.status);
          const paidAmount = Number(record.paidAmount || 0);
          const pendingAmount = Number(record.pendingAmount || 0);

          studentMap.set(key, {
            hasPaid: existing.hasPaid || status === 'Paid',
            hasPartial: existing.hasPartial || status === 'Partial' || (paidAmount > 0 && pendingAmount > 0),
            hasPendingBalance: existing.hasPendingBalance || status !== 'Paid' || pendingAmount > 0,
            allPaid: existing.allPaid && status === 'Paid' && pendingAmount <= 0,
          });

          return currentSummary;
        },
        {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
        },
      );

      const studentSummaries = Array.from(studentMap.values());

      return {
        ...summary,
        studentCount: studentSummaries.length,
        paidStudents: studentSummaries.filter((student) => student.allPaid).length,
        pendingStudents: studentSummaries.filter((student) => student.hasPendingBalance).length,
        partialStudents: studentSummaries.filter((student) => !student.allPaid && student.hasPartial).length,
      };
    },
    [classRecords],
  );

  const handlePrepareReport = () => {
    if (!selectedClassName) {
      return;
    }

    setGeneratedClassName(selectedClassName);
    setGeneratedAt(new Date());
  };

  const handleDownloadPdf = () => {
    if (!activeClassName) {
      return;
    }

    const reportGeneratedAt = generatedAt || new Date();
    if (!generatedAt) {
      setGeneratedAt(reportGeneratedAt);
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFillColor(58, 12, 110);
    doc.rect(0, 0, 297, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('EduSync ERP - Class Fee Report', 14, 16);

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.text(`Class: ${activeClassName}`, 14, 36);
    doc.text(`Generated: ${formatGeneratedAt(reportGeneratedAt)}`, 14, 42);
    doc.text(`Students: ${totals.studentCount}`, 14, 48);

    doc.text(`Total Fee: ${formatCurrency(totals.totalAmount)}`, 120, 36);
    doc.text(`Collected: ${formatCurrency(totals.paidAmount)}`, 120, 42);
    doc.text(`Pending: ${formatCurrency(totals.pendingAmount)}`, 120, 48);

    autoTable(doc, {
      startY: 56,
      head: [[
        'S.No',
        'Roll No',
        'Student Name',
        'Class',
        'Fee Type',
        'Due Date',
        'Total',
        'Paid',
        'Pending',
        'Status',
        'Note',
      ]],
      body: reportRows.length > 0
        ? reportRows.map((row) => [
            row.serial,
            row.rollNo,
            row.studentName,
            row.sectionName,
            row.feeType,
            row.dueDate,
            row.totalAmount,
            row.paidAmount,
            row.pendingAmount,
            row.status,
            row.note,
          ])
        : [['', '', 'No fee records found for this class.', '', '', '', '', '', '', '', '']],
      theme: 'grid',
      headStyles: {
        fillColor: [109, 40, 217],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 18 },
        2: { cellWidth: 36 },
        3: { cellWidth: 20 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
        7: { cellWidth: 22 },
        8: { cellWidth: 22 },
        9: { cellWidth: 20 },
        10: { cellWidth: 52 },
      },
      margin: { left: 10, right: 10 },
    });

    const safeClassName = activeClassName.replace(/[^a-z0-9]+/gi, '_');
    doc.save(`Fee_Report_${safeClassName}.pdf`);
  };

  return (
    <div className="space-y-5 p-3 lg:p-8">
      <section className="border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accountant Reports</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Class Fee Reports</h1>
            <p className="text-base text-slate-500">
              Select a class, review its fee collection summary, and download a detailed PDF statement in table format.
            </p>
          </div>

          <div className="grid gap-3 border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div className="rounded bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Classes</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{classOptions.length}</p>
            </div>
            <div className="rounded bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fee Records</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{feeRecords.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
          <label className="space-y-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">Select Class</span>
            <select
              value={selectedClassName}
              onChange={(event) => setSelectedClassName(event.target.value)}
              className="w-full rounded border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option value="">Choose a class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handlePrepareReport}
            disabled={!selectedClassName}
            className="inline-flex items-center justify-center gap-2 rounded bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <FileText className="h-4 w-4" />
            Prepare Report
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!activeClassName}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        {!activeClassName ? (
          <div className="flex min-h-[220px] flex-col items-start justify-center rounded border border-dashed border-slate-200 bg-slate-50 px-6 text-left">
            <GraduationCap className="h-10 w-10 text-blue-700" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">Prepare a Class Report</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Pick a class above to view the fee collection summary and printable student list.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-[24px] bg-slate-950 px-5 py-6 text-white lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">Generated Report</p>
                <h2 className="mt-2 text-3xl font-bold">{activeClassName}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Generated on {formatGeneratedAt(generatedAt || new Date())}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[20px] bg-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-violet-100">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Students</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold">{totals.studentCount}</p>
                </div>
                <div className="rounded-[20px] bg-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-violet-100">
                    <IndianRupee className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">Total</span>
                  </div>
                  <p className="mt-2 text-xl font-bold">{formatCurrency(totals.totalAmount)}</p>
                </div>
                <div className="rounded-[20px] bg-emerald-400/15 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Collected</p>
                  <p className="mt-2 text-xl font-bold text-white">{formatCurrency(totals.paidAmount)}</p>
                </div>
                <div className="rounded-[20px] bg-amber-400/15 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Pending</p>
                  <p className="mt-2 text-xl font-bold text-white">{formatCurrency(totals.pendingAmount)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Paid Students</p>
                <p className="mt-3 text-3xl font-bold text-emerald-600">{totals.paidStudents}</p>
              </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Pending Students</p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">{totals.pendingStudents}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Partial Students</p>
                  <p className="mt-3 text-3xl font-bold text-sky-600">{totals.partialStudents}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Collection Rate</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {totals.totalAmount > 0 ? `${Math.round((totals.paidAmount / totals.totalAmount) * 100)}%` : '0%'}
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Report Status</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">
                    {classRecords.length > 0 ? 'Ready' : 'Empty'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-4 py-4">Roll No</th>
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Class</th>
                      <th className="px-4 py-4">Fee Type</th>
                      <th className="px-4 py-4">Due Date</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Paid</th>
                      <th className="px-4 py-4">Pending</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {classRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                          No fee records found for this class.
                        </td>
                      </tr>
                    ) : (
                      reportRows.map((row, index) => (
                        <tr key={`${row.rollNo}-${row.feeType}-${index}`} className="text-sm text-slate-700">
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">{row.rollNo}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{row.studentName}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">{row.sectionName}</td>
                          <td className="whitespace-nowrap px-4 py-4">{row.feeType}</td>
                          <td className="whitespace-nowrap px-4 py-4">{row.dueDate}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">{row.totalAmount}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-emerald-600">{row.paidAmount}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-amber-600">{row.pendingAmount}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                row.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : row.status === 'Partial'
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-4 py-4 text-xs text-slate-500">{row.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading fee records...</div>
        ) : null}
      </section>
    </div>
  );
};

export default FinanceReportsPage;
