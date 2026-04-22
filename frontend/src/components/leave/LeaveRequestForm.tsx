import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLeaveStore } from '../../store/useLeaveStore';
import { Calendar, FileText, Send, User, BookOpen, CheckCircle2 } from 'lucide-react';

const LeaveRequestForm = () => {
  const { user } = useAuthStore();
  const { submitRequest } = useLeaveStore();
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    teacherName: 'Jane Smith', // Mocked teacher mapping
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    submitRequest({
      studentId: user.id || 'unknown',
      studentName: user.name || 'Student',
      class: user.class || '10-A',
      rollNumber: '101', // Mocked
      teacherId: 'u3', // Mocked mapping
      teacherName: formData.teacherName,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
    });

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ ...formData, startDate: '', endDate: '', reason: '' });
  };

  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const { requests } = useLeaveStore();
  const studentRequests = requests.filter(r => r.studentId === user?.id);

  const filteredRequests = studentRequests.filter(r => 
    filterStatus === 'All' || r.status === filterStatus
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} />
            Submit Leave Request
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Fill out the form below to request leave from your teacher.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {submitted && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} />
              <p className="text-sm font-bold">Leave request submitted successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} /> Student Name
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {user?.name}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} /> Class / Section
              </label>
              <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                {user?.class || '10-A'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Teacher / Department
            </label>
            <select 
              value={formData.teacherName}
              onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
            >
              <option value="Mr. Rajesh Kumar">Mr. Rajesh Kumar (Class Teacher)</option>
              <option value="Dr. Robert Wilson">Dr. Robert Wilson (Principal)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={14} /> Start Date
              </label>
              <input 
                required
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
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
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
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
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none resize-none"
              placeholder="Please explain why you need leave..."
            />
          </div>

          <button 
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Send size={18} />
            Submit Application
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Leave History</h2>
          <div className="flex gap-2">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === status 
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Calendar size={18} />
                  <span className="font-bold text-sm">{request.startDate} - {request.endDate}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  request.status === 'Pending' ? "bg-amber-50 text-amber-600" :
                  request.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                  "bg-rose-50 text-rose-600"
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

              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>To: {request.teacherName}</span>
                <span>{new Date(request.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {filteredRequests.length === 0 && (
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
