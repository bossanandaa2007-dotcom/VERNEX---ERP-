import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, FileText, RefreshCw, Send, User, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  createLeaveRequest,
  fetchStudentLeaveContext,
  fetchStudentLeaveRequests,
  type LeaveRequestRecord,
} from '../../services/leave';
import {
  fetchRecipientsForStudentContext,
  type RecipientOption,
  type RecipientRouteType,
} from '../../services/recipientRouting';

const LeaveRequestForm = () => {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentContext, setStudentContext] = useState<Awaited<ReturnType<typeof fetchStudentLeaveContext>>>(null);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    recipientType: 'Class Teacher' as RecipientRouteType,
    recipientId: '',
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;

    const loadData = async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const context = await fetchStudentLeaveContext(user.id);
        if (!active) {
          return;
        }

        setStudentContext(context);

        const [recipientRows, leaveRows] = await Promise.all([
          context ? fetchRecipientsForStudentContext(context, { includeSubjectTeachers: false }) : Promise.resolve([]),
          fetchStudentLeaveRequests(),
        ]);

        if (!active) {
          return;
        }

        setRecipients(recipientRows);
        setRequests(leaveRows);
        setFormData((current) => {
          const initialType = recipientRows.some((recipient) => recipient.routeType === current.recipientType)
            ? current.recipientType
            : (recipientRows[0]?.routeType || 'Class Teacher');
          const initialRecipient = recipientRows.find((recipient) => recipient.routeType === initialType);

          return {
            ...current,
            recipientType: initialType,
            recipientId: current.recipientId || initialRecipient?.id || '',
          };
        });
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message || 'Unable to load leave request data.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    const handleWindowFocus = () => {
      void loadData('refresh');
    };

    void loadData();
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user?.id]);

  const recipientOptions = useMemo(
    () => recipients.filter((recipient) => recipient.routeType === formData.recipientType),
    [formData.recipientType, recipients]
  );

  useEffect(() => {
    if (!recipientOptions.length) {
      setFormData((current) => ({ ...current, recipientId: '' }));
      return;
    }

    if (!recipientOptions.some((recipient) => recipient.id === formData.recipientId)) {
      setFormData((current) => ({ ...current, recipientId: recipientOptions[0].id }));
    }
  }, [formData.recipientId, recipientOptions]);

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => filterStatus === 'All' || request.status === filterStatus)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [requests, filterStatus]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('You need to be logged in to submit a leave request.');
      return;
    }

    if (!studentContext) {
      setError('Student profile context is not ready yet. Please refresh and try again.');
      return;
    }

    if (!formData.recipientId) {
      setError('Please choose a valid recipient before submitting.');
      return;
    }

    const selectedRecipient = recipientOptions.find((recipient) => recipient.id === formData.recipientId);
    if (!selectedRecipient) {
      setError('Please choose a valid recipient.');
      return;
    }

    setError(null);

    try {
      const created = await createLeaveRequest({
        studentId: user.id,
        studentName: studentContext.name,
        className: studentContext.className,
        rollNumber: studentContext.rollNo,
        teacherId: selectedRecipient.id,
        teacherName: selectedRecipient.name,
        recipientType: selectedRecipient.routeType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });

      setRequests((current) => [created, ...current]);
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 3000);
      setFormData((current) => ({ ...current, startDate: '', endDate: '', reason: '' }));
    } catch (submitError: any) {
      setError(submitError?.message || 'Failed to submit leave request.');
    }
  };

  const handleRefresh = async () => {
    if (!user?.id) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const context = await fetchStudentLeaveContext(user.id);
      setStudentContext(context);

      const [recipientRows, leaveRows] = await Promise.all([
        context ? fetchRecipientsForStudentContext(context, { includeSubjectTeachers: false }) : Promise.resolve([]),
        fetchStudentLeaveRequests(),
      ]);

      setRecipients(recipientRows);
      setRequests(leaveRows);
    } catch (refreshError: any) {
      setError(refreshError?.message || 'Unable to refresh leave request data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-1.5rem)] space-y-5 px-0.5 lg:max-w-4xl lg:space-y-8 lg:px-0">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/50 lg:rounded-3xl">
        <div className="bg-indigo-600 p-5 text-white lg:p-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} />
            Submit Leave Request
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Leave requests can only be sent to your class teacher or the governing body.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 lg:space-y-6 lg:p-8">
          {submitted && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} />
              <p className="text-sm font-bold">Leave request submitted successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} /> Student Name
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {studentContext?.name || user?.name || 'Loading...'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} /> Class / Section
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {studentContext?.className || user?.class || 'Loading...'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Route To
            </label>
            <select
              value={formData.recipientType}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  recipientType: event.target.value as RecipientRouteType,
                }))
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
              disabled={isLoading || !recipients.length}
            >
              <option value="Class Teacher">Class Teacher</option>
              <option value="Governing Body">Governing Body</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Teacher / Department
            </label>
            <select
              value={formData.recipientId}
              onChange={(event) => setFormData({ ...formData, recipientId: event.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
              disabled={isLoading || !recipientOptions.length}
            >
              {!recipientOptions.length && <option value="">No recipients available</option>}
              {recipientOptions.map((recipient) => (
                <option key={`${recipient.routeType}-${recipient.id}`} value={recipient.id}>
                  {recipient.name}
                  {recipient.subjects.length ? ` - ${recipient.subjects.join(', ')}` : ''}
                </option>
              ))}
            </select>
            {!isLoading && !recipientOptions.length && (
              <p className="text-xs font-medium text-amber-600">
                No matching recipient was found for this route yet. Add a class teacher or governing body recipient in the DB to enable routing.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> Start Date
              </label>
              <input
                required
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> End Date
              </label>
              <input
                required
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Reason for Leave
            </label>
            <textarea
              required
              rows={4}
              value={formData.reason}
              onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none resize-none"
              placeholder="Please explain why you need leave..."
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !recipientOptions.length}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={18} />
            Submit Application
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-bold text-slate-900">Leave History</h2>
          <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-5 lg:flex">
            <button
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-all lg:px-4 lg:py-1.5 ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500">
              Loading leave requests...
            </div>
          )}

          {!isLoading && filteredRequests.map((request) => (
            <div key={request.id} className="space-y-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md lg:rounded-3xl lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Calendar size={18} />
                  <span className="text-sm font-bold">{request.startDate} - {request.endDate}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  request.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                  request.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {request.status}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Reason</p>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">{request.reason}</p>
              </div>

              {request.teacherRemarks && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tight">Teacher Remarks</p>
                  <p className="text-sm text-slate-600 italic">"{request.teacherRemarks}"</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-slate-50 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="min-w-0 break-words">To: {request.teacherName}</span>
                <span>{new Date(request.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {!isLoading && filteredRequests.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium uppercase tracking-widest">No matching leave requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestForm;
