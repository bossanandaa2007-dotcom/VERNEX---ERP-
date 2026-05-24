import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Filter, Search, XCircle } from 'lucide-react';
import {
  fetchLeaveRequests,
  resolveLeaveRequest,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '../../services/leaveRequests';
import { useAuthStore } from '../../store/useAuthStore';

const statusClass = (status: LeaveRequestStatus) => {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-600';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-600';
  return 'bg-amber-50 text-amber-600';
};

const LeaveRequestInbox = () => {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | LeaveRequestStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchLeaveRequests({ teacherId: user.id })
      .then(setRequests)
      .catch((error) => {
        console.error('Failed to load leave requests:', error);
      });
  }, [user?.id]);

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((request) => {
          const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
          const createdDate = request.createdAt.split('T')[0];
          const matchesDateFrom = !dateFrom || createdDate >= dateFrom;
          const matchesDateTo = !dateTo || createdDate <= dateTo;
          const search = searchQuery.toLowerCase();
          const matchesSearch =
            request.studentName.toLowerCase().includes(search) ||
            request.className.toLowerCase().includes(search) ||
            request.rollNumber.toLowerCase().includes(search) ||
            request.reason.toLowerCase().includes(search);

          return matchesStatus && matchesDateFrom && matchesDateTo && matchesSearch;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [dateFrom, dateTo, requests, searchQuery, statusFilter]
  );

  const counts = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'Pending').length,
      approved: requests.filter((request) => request.status === 'Approved').length,
      rejected: requests.filter((request) => request.status === 'Rejected').length,
    }),
    [requests]
  );

  const handleResolve = async (requestId: string, status: Exclude<LeaveRequestStatus, 'Pending'>) => {
    const remarks = (document.getElementById(`leave-response-${requestId}`) as HTMLTextAreaElement | null)?.value;

    try {
      setIsUpdatingId(requestId);
      const updatedRequest = await resolveLeaveRequest(requestId, status, remarks || undefined);
      setRequests((current) => current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request)));
    } catch (error) {
      console.error('Failed to resolve leave request:', error);
    } finally {
      setIsUpdatingId(null);
    }
  };

  return (
    <div className="erp-page">
      <section className="erp-page-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="erp-kicker">4. Leave Requests</p>
            <h1 className="erp-title">Review student leave requests</h1>
            <p className="erp-subtitle">Approve or reject requests from students assigned to your class.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{counts.pending}</p>
              <p className="erp-section-label">Pending</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{counts.approved}</p>
              <p className="erp-section-label">Approved</p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xl font-bold text-slate-900">{counts.rejected}</p>
              <p className="erp-section-label">Rejected</p>
            </div>
          </div>
        </div>
      </section>

      <div className="erp-card flex flex-col gap-3 p-4 lg:flex-row lg:gap-4 lg:p-5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search leave history..."
            className="erp-input w-full py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
          <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'All' | LeaveRequestStatus)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-600 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="erp-input min-w-0 px-3 py-2 text-sm text-slate-600 outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="erp-input min-w-0 px-3 py-2 text-sm text-slate-600 outline-none"
          />
        </div>
      </div>

      <div className="erp-table-wrap">
        <div className="space-y-3 bg-slate-50 p-3 md:hidden">
          {filteredRequests.map((request) => (
            <div key={request.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{request.studentName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{request.className} / Roll {request.rollNumber}</p>
                </div>
                <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(request.status)}`}>
                  {request.status}
                </span>
              </div>
              <p className="erp-section-label mt-3">{request.startDate} to {request.endDate}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{request.reason}</p>
              <textarea
                id={`leave-response-${request.id}`}
                rows={2}
                defaultValue={request.teacherRemarks || ''}
                placeholder="Add note"
                className="erp-input mt-3 w-full resize-none px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              {request.status === 'Pending' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void handleResolve(request.id, 'Approved')}
                    disabled={isUpdatingId === request.id}
                    className="flex items-center justify-center gap-1.5 rounded bg-emerald-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} /> Accept
                  </button>
                  <button
                    onClick={() => void handleResolve(request.id, 'Rejected')}
                    disabled={isUpdatingId === request.id}
                    className="flex items-center justify-center gap-1.5 rounded bg-rose-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Clock size={16} /> Closed on {new Date(request.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-100 px-6 py-4">Student</th>
                <th className="border-b border-slate-100 px-6 py-4">Dates</th>
                <th className="border-b border-slate-100 px-6 py-4">Reason</th>
                <th className="border-b border-slate-100 px-6 py-4">Status</th>
                <th className="border-b border-slate-100 px-6 py-4">Teacher Note</th>
                <th className="border-b border-slate-100 px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{request.studentName}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{request.className} / Roll {request.rollNumber}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{request.startDate} to {request.endDate}</td>
                  <td className="max-w-xs px-6 py-4 font-medium text-slate-600">{request.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${statusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <textarea
                      id={`leave-response-${request.id}`}
                      rows={2}
                      defaultValue={request.teacherRemarks || ''}
                      placeholder="Add note"
                      className="erp-input w-full min-w-[220px] resize-none px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </td>
                  <td className="space-y-2 px-6 py-4">
                    {request.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => void handleResolve(request.id, 'Approved')}
                          disabled={isUpdatingId === request.id}
                          className="flex w-full items-center justify-center gap-1.5 rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 size={15} /> Accept
                        </button>
                        <button
                          onClick={() => void handleResolve(request.id, 'Rejected')}
                          disabled={isUpdatingId === request.id}
                          className="flex w-full items-center justify-center gap-1.5 rounded bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-slate-500">Saved to history</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="border-t border-slate-100 py-12 text-center text-sm font-bold uppercase tracking-wide text-slate-400">
            No leave requests match the current filters
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestInbox;
