import { useEffect, useMemo, useState } from 'react';
import { Filter, MessageSquare, Search } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useComplaintStore, type ComplaintStatus } from '../../store/useComplaintStore';
import { fetchComplaints, resolveComplaint } from '../../services/complaints';

const ComplaintInbox = () => {
  const { user } = useAuthStore();
  const { complaints, setComplaints, updateComplaint, syncComplaint } = useComplaintStore();
  const [statusFilter, setStatusFilter] = useState<'All' | ComplaintStatus>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isTeacher = user?.role === 'Teacher';
  const targetRole = isTeacher ? 'Teacher' : 'Governing Body';

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchComplaints({ targetRole, targetId: user.id })
      .then((result) => {
        setComplaints(result);
      })
      .catch((error) => {
        console.error('Failed to fetch complaints:', error);
      });
  }, [setComplaints, targetRole, user?.id]);

  const filteredComplaints = useMemo(
    () =>
      complaints
        .filter((complaint) => {
          const matchesTarget = complaint.targetRole === targetRole && complaint.targetId === user?.id;
          const matchesStatus = statusFilter === 'All' || complaint.status === statusFilter;
          const createdAt = complaint.createdAt.split('T')[0];
          const matchesDateFrom = !dateFrom || createdAt >= dateFrom;
          const matchesDateTo = !dateTo || createdAt <= dateTo;
          const matchesSearch =
            complaint.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            complaint.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            complaint.targetType?.toLowerCase().includes(searchQuery.toLowerCase());

          return matchesTarget && matchesStatus && matchesDateFrom && matchesDateTo && matchesSearch;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [complaints, dateFrom, dateTo, isTeacher, searchQuery, statusFilter, user?.id]
  );

  const handleResolve = async (complaintId: string) => {
    const response = (document.getElementById(`complaint-response-${complaintId}`) as HTMLTextAreaElement | null)?.value;

    updateComplaint(complaintId, 'RESOLVED', response || undefined);

    try {
      const complaint = await resolveComplaint(complaintId, response || undefined);
      syncComplaint(complaint);
    } catch (error) {
      console.error('Failed to update complaint in Supabase:', error);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="rounded-[1.5rem] bg-indigo-600 p-5 text-white lg:rounded-3xl lg:p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare size={24} />
          Complaint Management
        </h1>
        <p className="text-indigo-100 text-sm mt-1">
          Review student complaints routed to {isTeacher ? 'your teacher account' : 'the governing body'}.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm lg:flex-row lg:gap-4 lg:rounded-3xl lg:p-5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search complaints..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'All' | ComplaintStatus)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-600 outline-none"
            >
              <option value="All">All Status</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm lg:rounded-3xl">
        <div className="space-y-3 bg-slate-50 p-3 md:hidden">
          {filteredComplaints.map((complaint) => (
            <div key={complaint.id} className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-900">{complaint.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{complaint.studentName} - {complaint.class} / {complaint.section}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${complaint.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {complaint.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs min-[380px]:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="font-black uppercase tracking-wider text-slate-400">Type</p>
                  <p className="mt-1 break-words font-bold text-slate-800">{complaint.type}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="font-black uppercase tracking-wider text-slate-400">Date</p>
                  <p className="mt-1 font-bold text-slate-800">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <textarea
                id={`complaint-response-${complaint.id}`}
                rows={2}
                defaultValue={complaint.response || ''}
                placeholder="Add response (optional)"
                className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-100"
              />
              {complaint.status === 'OPEN' ? (
                <button
                  onClick={() => void handleResolve(complaint.id)}
                  className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-colors active:scale-[0.98] hover:bg-emerald-700"
                >
                  Mark as Resolved
                </button>
              ) : (
                <p className="mt-3 text-sm font-bold text-emerald-600">Resolved</p>
              )}
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100">Complaint ID</th>
                <th className="px-6 py-4 border-b border-slate-100">Student Name</th>
                <th className="px-6 py-4 border-b border-slate-100">Type</th>
                <th className="px-6 py-4 border-b border-slate-100">Route</th>
                <th className="px-6 py-4 border-b border-slate-100">Status</th>
                <th className="px-6 py-4 border-b border-slate-100">Date</th>
                <th className="px-6 py-4 border-b border-slate-100">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="px-6 py-4 font-bold text-slate-700">{complaint.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{complaint.studentName}</p>
                      <p className="text-xs text-slate-500 mt-1">{complaint.class} / {complaint.section}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{complaint.type}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{complaint.targetType || complaint.targetRole}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${complaint.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 space-y-3">
                    <textarea
                      id={`complaint-response-${complaint.id}`}
                      rows={2}
                      defaultValue={complaint.response || ''}
                      placeholder="Add response (optional)"
                      className="w-full min-w-[240px] px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                    />
                    {complaint.status === 'OPEN' ? (
                      <button
                        onClick={() => void handleResolve(complaint.id)}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                      >
                        Mark as Resolved
                      </button>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600">Resolved</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredComplaints.length === 0 && (
          <div className="py-16 text-center border-t border-slate-100">
            <p className="text-slate-400 font-medium uppercase tracking-widest">No complaints match the current filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintInbox;
