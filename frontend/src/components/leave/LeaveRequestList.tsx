import { useMemo, useRef, useState } from 'react';
import { useLeaveStore } from '../../store/useLeaveStore';
import type { LeaveRequest } from '../../store/useLeaveStore';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import { cn } from '../../components/layout/Sidebar';
import { format, parseISO } from 'date-fns';

const LeaveRequestList = () => {
  const { requests, updateStatus } = useLeaveStore();
  const [filterStatus, setFilterStatus] = useState<LeaveRequest['status'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const pendingSectionRef = useRef<HTMLDivElement | null>(null);
  const currentMonthKey = format(new Date(), 'MMMM yyyy');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({
    [currentMonthKey]: true,
  });

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
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [requests, filterStatus, searchQuery]
  );

  const pendingRequests = filteredRequests.filter((request) => request.status === 'Pending');

  const groupedRequests = useMemo(() => {
    const grouped = filteredRequests
      .filter((request) => request.status !== 'Pending')
      .reduce<Record<string, LeaveRequest[]>>((acc, request) => {
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

  const handleDecision = (requestId: string, status: LeaveRequest['status']) => {
    const remarks = (document.getElementById(`remarks-${requestId}`) as HTMLTextAreaElement | null)?.value;
    updateStatus(requestId, status, remarks || undefined);
  };

  const renderRequestCard = (request: LeaveRequest, highlighted = false) => (
    <div
      key={request.id}
      className={cn(
        "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group",
        highlighted && "border-amber-200 bg-amber-50/40"
      )}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg",
                  highlighted ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-indigo-600"
                )}
              >
                {request.studentName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{request.studentName}</h3>
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  Class {request.class} • Roll No: {request.rollNumber}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                request.status === 'Pending'
                  ? "bg-amber-100 text-amber-700"
                  : request.status === 'Approved'
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
              )}
            >
              {request.status}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {request.status === 'Pending' && (
          <div className="lg:w-64 flex flex-col gap-3 justify-center">
            <textarea
              id={`remarks-${request.id}`}
              placeholder="Add remarks (optional)..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleDecision(request.id, 'Approved')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all text-xs"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
              <button
                onClick={() => handleDecision(request.id, 'Rejected')}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Requests</h2>
          <p className="text-slate-500 text-sm">Review student applications and historical data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-sm w-full md:w-64"
            />
          </div>

          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filterStatus === status
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-colors"
        >
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-400 px-2 text-xs font-black text-slate-900">
            {pendingRequests.length}
          </span>
          <span className="text-sm font-bold">Pending Requests</span>
        </button>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length > 0 ? (
          <>
            {pendingRequests.length > 0 && (
              <section ref={pendingSectionRef} className="space-y-4">
                <div className="flex items-center justify-between rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4">
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
                  className="flex w-full items-center justify-between rounded-3xl bg-white px-6 py-4 border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
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
                        "text-slate-400 transition-transform",
                        isMonthExpanded(monthKey) && "rotate-180"
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
