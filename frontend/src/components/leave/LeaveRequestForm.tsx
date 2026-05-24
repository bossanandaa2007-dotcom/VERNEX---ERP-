import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, Send, UserRound } from 'lucide-react';
import { createLeaveRequest, fetchLeaveRequests, type LeaveRequest } from '../../services/leaveRequests';
import {
  fetchRecipientsForStudentContext,
  fetchStudentRoutingContext,
  type RecipientOption,
  type StudentRoutingContext,
} from '../../services/recipientRouting';
import { useAuthStore } from '../../store/useAuthStore';

const today = new Date().toISOString().split('T')[0];

const statusClass = (status: LeaveRequest['status']) => {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-600';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-600';
  return 'bg-amber-50 text-amber-600';
};

const LeaveRequestForm = () => {
  const user = useAuthStore((state) => state.user);
  const [studentContext, setStudentContext] = useState<StudentRoutingContext | null>(null);
  const [classTeacher, setClassTeacher] = useState<RecipientOption | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: today,
    endDate: today,
    reason: '',
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    Promise.all([
      fetchLeaveRequests({ studentId: user.id }),
      fetchStudentRoutingContext(user.id).then(async (context) => {
        setStudentContext(context);
        if (!context) return null;
        const recipients = await fetchRecipientsForStudentContext(context, { includeSubjectTeachers: false });
        return recipients.find((recipient) => recipient.routeType === 'Class Teacher') || null;
      }),
    ])
      .then(([leaveRows, teacher]) => {
        setRequests(leaveRows);
        setClassTeacher(teacher);
      })
      .catch((error) => {
        console.error('Failed to load leave request context:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load leave request details.');
      });
  }, [user?.id]);

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classTeacher) {
      setErrorMessage('No class teacher is assigned to your class yet.');
      return;
    }

    if (formData.endDate < formData.startDate) {
      setErrorMessage('End date cannot be earlier than start date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const savedRequest = await createLeaveRequest({
        teacherId: classTeacher.id,
        teacherName: classTeacher.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      });
      setRequests((current) => [savedRequest, ...current.filter((request) => request.id !== savedRequest.id)]);
      setFormData({ startDate: today, endDate: today, reason: '' });
      setSuccessMessage('Leave request sent to your class teacher.');
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="erp-page mx-auto w-full max-w-[calc(100vw-1.5rem)] px-0.5 lg:max-w-6xl lg:px-0">
      <section className="erp-page-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="erp-kicker">Leave Request</p>
            <h1 className="erp-title">Request leave from your class teacher</h1>
            <p className="erp-subtitle">
              Requests are routed only to the teacher assigned to {studentContext?.className || user?.class || 'your class'}.
            </p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="erp-section-label">Class Teacher</p>
            <p className="mt-1 text-base font-bold text-blue-700">{classTeacher?.name || 'Not assigned'}</p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="erp-card space-y-5 p-4 lg:p-6">
        {errorMessage && (
          <div className="flex items-center gap-3 rounded border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertCircle size={18} />
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="flex items-center gap-3 rounded border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <UserRound size={14} /> Student
            </label>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              {studentContext?.name || user?.name || 'Student'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ClipboardList size={14} /> Class / Roll No
            </label>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              {studentContext?.className || user?.class || '-'} / {studentContext?.rollNo || '-'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <CalendarDays size={14} /> From
            </label>
            <input
              type="date"
              min={today}
              required
              value={formData.startDate}
              onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
              className="erp-input w-full px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <CalendarDays size={14} /> To
            </label>
            <input
              type="date"
              min={formData.startDate || today}
              required
              value={formData.endDate}
              onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
              className="erp-input w-full px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <ClipboardList size={14} /> Reason
          </label>
          <textarea
            required
            rows={5}
            maxLength={300}
            value={formData.reason}
            onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Write the reason for leave..."
            className="erp-input w-full resize-none px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !classTeacher}
          className="erp-primary-button flex w-full items-center justify-center gap-2 px-6 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={18} />
          {isSubmitting ? 'Sending Request...' : 'Send Leave Request'}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">My Leave History</h2>
        <div className="erp-table-wrap">
          <div className="space-y-3 bg-slate-50 p-3 md:hidden">
            {sortedRequests.map((request) => (
              <div key={request.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{request.startDate} to {request.endDate}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{request.teacherName}</p>
                  </div>
                  <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{request.reason}</p>
                {request.teacherRemarks && <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{request.teacherRemarks}</p>}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-100 px-6 py-4">Dates</th>
                  <th className="border-b border-slate-100 px-6 py-4">Reason</th>
                  <th className="border-b border-slate-100 px-6 py-4">Teacher</th>
                  <th className="border-b border-slate-100 px-6 py-4">Status</th>
                  <th className="border-b border-slate-100 px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 font-bold text-slate-700">{request.startDate} to {request.endDate}</td>
                    <td className="max-w-xs px-6 py-4 font-medium text-slate-600">{request.reason}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{request.teacherName}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{request.teacherRemarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedRequests.length === 0 && (
            <div className="border-t border-slate-100 bg-slate-50 py-10 text-center text-sm font-bold uppercase tracking-wide text-slate-400">
              No leave requests yet
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LeaveRequestForm;
