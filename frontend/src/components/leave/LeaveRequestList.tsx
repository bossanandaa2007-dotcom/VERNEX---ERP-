import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../../components/layout/Sidebar';
import { fetchTeacherLeaveRequests, updateLeaveRequestStatus, type LeaveRequestRecord } from '../../services/leave';

const LeaveRequestList = () => {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeaveRequestRecord['status'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const pendingSectionRef = useRef<HTMLDivElement | null>(null);
  const currentMonthKey = format(new Date(), 'MMMM yyyy');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthKey]: true,
  });

  useEffect(() => {
    let active = true;

    const loadRequests = async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const data = await fetchTeacherLeaveRequests();
        if (active) {
          setRequests(data);
        }
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message || 'Unable to load leave requests.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    const handleWindowFocus = () => {
      void loadRequests('refresh');
    };

    void loadRequests();
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => {
          const matchesStatus = filterStatus === 'All' || request.status === filterStatus;
          const matchesSearch =
            request.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            request.reason.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesStatus && matchesSearch;
        })
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [requests, filterStatus, searchQuery]
  );

  const pendingRequests = filteredRequests.filter((request) => request.status === 'Pending');

  const groupedRequests = useMemo(() => {
    const grouped = filteredRequests
      .filter((request) => request.status !== 'Pending')
      .reduce<Record<string, LeaveRequestRecord[]>>((acc, request) => {
        const monthKey = format(parseISO(request.timestamp), 'MMMM yyyy');
        acc[monthKey] = [...(acc[monthKey] || []), request];
        return acc;
      }, {});

    return Object.entries(grouped).sort(
      ([monthA], [monthB]) => new Date(monthB).getTime() - new Date(monthA).getTime()
    );
  }, [filteredRequests]);

  const scrollToPending = () => {
    pendingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !(prev[monthKey] ?? monthKey === currentMonthKey),
    }));
  };

  const isMonthExpanded = (monthKey: string) => expandedMonths[monthKey] ?? monthKey === currentMonthKey;

  const handleDecision = async (requestId: string, status: LeaveRequestRecord['status']) => {
    const remarks = (document.getElementById(`remarks-${requestId}`) as HTMLTextAreaElement | null)?.value;

    try {
      const updated = await updateLeaveRequestStatus(requestId, status, remarks || undefined);
      setRequests((current) => current.map((request) => request.id === requestId ? updated : request));
    } catch (updateError: any) {
      setError(updateError?.message || 'Unable to update leave request.');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchTeacherLeaveRequests();
      setRequests(data);
    } catch (refreshError: any) {
      setError(refreshError?.message || 'Unable to refresh leave requests.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderRequestCard = (request: LeaveRequestRecord, highlighted = false) => (
    <div
      key={request.id}
      className={cn(
        'bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group',
        highlighted && 'border-amber-200 bg-amber-50/40'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg',
                  highlighted ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
                )}
              >
                {request.studentName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="break-words font-bold text-slate-900">{request.studentName}</h3>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  Class {request.class} - Roll No: {request.rollNumber}
                </p>
              </div>
            </div>
            <div
              className={cn(
                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                request.status === 'Pending'
                  ? 'bg-amber-100 text-amber-700'
                  : request.status === 'Approved'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
              )}
            >
              {request.status}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</p>
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Calendar size={14} className="text-indigo-500" />
                {request.startDate} to {request.endDate}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Applied On</p>
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Clock size={14} className="text-indigo-500" />
                {format(new Date(request.timestamp), 'MMM d, h:mm a')}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reason</p>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{request.reason}</p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Assigned To: {request.teacherName} ({request.recipientType})
          </div>
        </div>

        {request.status === 'Pending' && (
          <div className="flex flex-col justify-center gap-3 lg:w-64">
            <textarea
              id={`remarks-${request.id}`}
              placeholder="Add remarks (optional)..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void handleDecision(request.id, 'Approved')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all text-xs"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
              <button
                onClick={() => void handleDecision(request.id, 'Rejected')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-white text-rose-600 border border-rose-100 font-bold rounded-xl hover:bg-rose-50 transition-all text-xs"
              >
                <XCircle size={14} />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-slate-500 text-sm">Only leave requests assigned to you are visible here.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 md:flex md:flex-wrap md:items-center md:gap-3">
          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-sm w-full md:w-64"
            />
          </div>

          <div className="col-span-full grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm min-[380px]:grid-cols-4 md:flex">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-bold transition-all md:px-4 md:py-1.5',
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <button
          onClick={scrollToPending}
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl shadow-slate-900/20 transition-colors hover:bg-slate-800 lg:bottom-6 lg:right-6 lg:px-5"
        >
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-xs font-black text-slate-900">
            {pendingRequests.length}
          </span>
          <span className="text-sm font-bold">Pending Requests</span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center text-sm font-medium text-slate-500">
            Loading leave applications from Supabase...
          </div>
        ) : filteredRequests.length > 0 ? (
          <>
            {pendingRequests.length > 0 && (
              <section ref={pendingSectionRef} className="space-y-4">
                <div className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 lg:rounded-3xl lg:px-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Pending Requests</h3>
                    <p className="text-sm text-slate-600">Review these requests before archived decisions.</p>
                  </div>
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-900">
                    {pendingRequests.length} Pending
                  </span>
                </div>

                {pendingRequests.map((request) => renderRequestCard(request, true))}
              </section>
            )}

            {groupedRequests.map(([monthKey, monthRequests]) => (
              <section key={monthKey} className="space-y-4">
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white px-4 py-4 shadow-sm transition-colors hover:bg-slate-50 lg:rounded-3xl lg:px-6"
                >
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900">{monthKey}</h3>
                    <p className="text-sm text-slate-500">
                      {monthRequests.length} request{monthRequests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600">
                      {monthRequests.length}
                    </span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        'text-slate-400 transition-transform',
                        isMonthExpanded(monthKey) && 'rotate-180'
                      )}
                    />
                  </div>
                </button>

                {isMonthExpanded(monthKey) && (
                  <div className="space-y-4">
                    {monthRequests.map((request) => renderRequestCard(request))}
                  </div>
                )}
              </section>
            ))}
          </>
        ) : (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No applications found</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Either no leave requests have been submitted yet or they do not match your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestList;
