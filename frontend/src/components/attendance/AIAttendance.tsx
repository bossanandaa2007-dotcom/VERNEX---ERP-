import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCcw, Upload } from 'lucide-react';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import { generateAttendancePreview, saveAttendanceConfirmation } from '../../services/attendance';
import type { AttendanceValue } from '../../types/attendance';
import { useAuthStore } from '../../store/useAuthStore';

interface AttendanceRow {
  studentName: string;
  attendance: AttendanceValue[];
}

const DEFAULT_DAY_COUNT = 5;

const AIAttendance = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addRecords } = useAttendanceStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [dayCount, setDayCount] = useState(DEFAULT_DAY_COUNT);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedClass, setSelectedClass] = useState(user?.classes?.[0] || user?.class || '10-A');

  const hasData = rows.length > 0;

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        attendance: Array.from({ length: dayCount }, (_, index) => row.attendance[index] || 'A'),
      })),
    [rows, dayCount]
  );

  const uploadImage = async (file: File) => {
    setIsLoading(true);
    setNotification(null);
    setFileName(file.name);

    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const payload = await generateAttendancePreview(file);

      const students = Array.isArray(payload?.data?.students) ? payload.data.students : [];
      if (students.length === 0) {
        throw new Error('No students detected in the uploaded image. Try a smaller, clearer test image.');
      }

      const detectedDayCount = Math.max(
        1,
        Math.min(
          DEFAULT_DAY_COUNT,
          ...students.map((student: { attendance?: string[] }) => student.attendance?.length || 0)
        )
      );

      setDayCount(detectedDayCount);
      setRows(
        students.map((student: { studentName: string; attendance: string[] }) => ({
          studentName: student.studentName || 'Unknown Student',
          attendance: Array.from({ length: detectedDayCount }, (_, index) =>
            student.attendance?.[index] === 'A' ? 'A' : 'P'
          ),
        }))
      );
    } catch (error) {
      console.error(error);
      setRows([]);
      setDayCount(DEFAULT_DAY_COUNT);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not load AI attendance preview.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
  };

  const handleCellChange = (rowIndex: number, dayIndex: number, value: AttendanceValue) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              attendance: row.attendance.map((cell, cellIndex) => (cellIndex === dayIndex ? value : cell)),
            }
          : row
      )
    );
  };

  const handleReupload = () => {
    fileInputRef.current?.click();
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    setNotification(null);

    try {
      await saveAttendanceConfirmation({
        sectionId: selectedClass,
        attendanceDate: new Date().toISOString().split('T')[0],
        students: normalizedRows,
      });

      addRecords(
        normalizedRows.map((row) => ({
          studentId: row.studentName.toLowerCase().replace(/\s+/g, '-'),
          studentName: row.studentName,
          classId: selectedClass,
          date: new Date().toISOString().split('T')[0],
          status: row.attendance[dayCount - 1] === 'P' ? 'Present' : 'Absent',
          source: 'AI' as const,
          confidenceScore: 0.95,
          metadata: {
            consensus: 0.95,
            engines: ['Gemini AI'],
            reasoning: `Attendance sequence: ${row.attendance.join(', ')}`,
          },
        })) as any
      );

      setNotification({ type: 'success', message: 'Attendance saved successfully.' });
    } catch (error) {
      console.error(error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not save attendance.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Attendance</h1>
          <p className="text-sm text-slate-500">Upload a small test image, review the preview, then confirm the final sheet.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            {(user?.classes || [user?.class || '10-A']).map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload Image
          </button>

          {hasData && (
            <button
              onClick={handleReupload}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              <RefreshCcw size={16} />
              Re-upload
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900">Upload</h2>
          <p className="mt-1 text-sm text-slate-500">Choose a clear test image with up to 5 students and 5 attendance days.</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 flex min-h-[280px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-center hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Attendance Upload" className="h-full max-h-[280px] w-full rounded-[1.4rem] object-cover" />
            ) : (
              <div className="space-y-3 px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">Upload attendance image</p>
                  <p className="text-sm text-slate-500">PNG, JPG, or scanned register image</p>
                </div>
              </div>
            )}
          </button>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {fileName ? `Selected file: ${fileName}` : 'No file selected yet.'}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Attendance Preview</h2>
              <p className="mt-1 text-sm text-slate-500">Review and edit each student&apos;s attendance preview before saving.</p>
            </div>

            <button
              onClick={handleConfirm}
              disabled={!hasData || isSaving || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm & Save
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="font-medium">Generating attendance preview...</span>
                </div>
              </div>
            ) : hasData ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="px-3 py-2.5 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Student</th>
                    {Array.from({ length: dayCount }, (_, index) => (
                      <th key={index} className="px-2 py-2.5 text-center min-w-[60px]">
                        Day {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalizedRows.map((row, rowIndex) => (
                    <tr key={`${row.studentName}-${rowIndex}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-semibold text-slate-900">
                        {row.studentName}
                      </td>
                      {row.attendance.map((value, dayIndex) => (
                        <td key={dayIndex} className="px-1.5 py-2 text-center">
                          <select
                            value={value}
                            onChange={(event) => handleCellChange(rowIndex, dayIndex, event.target.value as AttendanceValue)}
                            className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                          >
                            <option value="P">P</option>
                            <option value="A">A</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <div className="space-y-2 px-6">
                  <p className="text-base font-bold text-slate-900">No attendance preview yet</p>
                  <p className="text-sm text-slate-500">Upload a small test image to generate an editable attendance preview.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAttendance;
