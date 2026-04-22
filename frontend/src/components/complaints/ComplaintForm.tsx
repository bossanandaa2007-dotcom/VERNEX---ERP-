import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Flag,
  Info,
  School,
  Send,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { mockUsers } from '../../mock-data';
import {
  useComplaintStore,
  type ComplaintDivision,
  type ComplaintPriority,
  type ComplaintType,
} from '../../store/useComplaintStore';

const COMPLAINT_API_BASE = import.meta.env.VITE_API_BASE || '/api';
const MAX_DESCRIPTION_LENGTH = 250;

type SendToOption = 'Class Teacher' | 'Subject Teacher' | 'Governing Body';

const divisionCards: { title: ComplaintDivision; description: string }[] = [
  {
    title: 'Girls',
    description: 'Fast complaint routing for girls division academic, hostel, and campus concerns.',
  },
  {
    title: 'Boys',
    description: 'Quick reporting flow for boys division classroom, hostel, and discipline issues.',
  },
];

const complaintTypes: ComplaintType[] = ['Academic', 'Hostel', 'Discipline', 'Infrastructure', 'Other'];
const priorities: ComplaintPriority[] = ['Low', 'Medium', 'High'];

const resolveTargetId = (sendTo: SendToOption) => {
  if (sendTo === 'Governing Body') {
    return 'u2';
  }

  if (sendTo === 'Subject Teacher') {
    return mockUsers.find((user) => user.role === 'Teacher' && user.id === 't2')?.id || 't2';
  }

  return mockUsers.find((user) => user.role === 'Teacher' && user.id === 't1')?.id || 't1';
};

const formatTrackingId = (complaintId: string) => complaintId.replace(/^cmp/i, 'CMP');

const ComplaintForm = () => {
  const { user } = useAuthStore();
  const { complaints, submitComplaint, syncComplaint } = useComplaintStore();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    division: 'Boys' as ComplaintDivision,
    sendTo: 'Class Teacher' as SendToOption,
    title: '',
    description: '',
    type: 'Academic' as ComplaintType,
    priority: 'Medium' as ComplaintPriority,
    createdAt: new Date().toISOString().split('T')[0],
  });

  const studentComplaints = useMemo(
    () =>
      complaints
        .filter((complaint) => complaint.studentId === user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [complaints, user?.id]
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetch(`${COMPLAINT_API_BASE}/complaints?studentId=${user.id}`)
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result?.complaints)) {
          result.complaints.forEach(syncComplaint);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch student complaints:', error);
      });
  }, [syncComplaint, user?.id]);

  useEffect(() => {
    if (!isFormHighlighted) {
      return;
    }

    const timer = window.setTimeout(() => setIsFormHighlighted(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isFormHighlighted]);

  const handleDivisionSelect = (division: ComplaintDivision) => {
    setFormData((current) => ({ ...current, division }));
    setIsFormHighlighted(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      studentId: user.id,
      studentName: user.name || 'Student',
      class: user.class || '10-A',
      section: user.section || 'A',
      division: formData.division,
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: formData.type,
      targetId: resolveTargetId(formData.sendTo),
      priority: formData.priority,
    };

    try {
      const localComplaint = submitComplaint(payload);
      setSuccessTrackingId(formatTrackingId(localComplaint.id));

      try {
        const response = await fetch(`${COMPLAINT_API_BASE}/complaints`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to submit complaint.');
        }

        if (result?.complaint) {
          syncComplaint(result.complaint);
          setSuccessTrackingId(formatTrackingId(result.complaint.id));
        }
      } catch (apiError) {
        console.error('Complaint API sync failed:', apiError);
      }

      setFormData((current) => ({
        ...current,
        title: '',
        description: '',
        type: 'Academic',
        sendTo: 'Class Teacher',
        priority: 'Medium',
        createdAt: new Date().toISOString().split('T')[0],
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {successTrackingId && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-white border border-emerald-100 shadow-2xl rounded-3xl p-5 min-w-[290px]">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">Complaint Submitted Successfully</p>
                <p className="text-sm text-slate-500 mt-1">Tracking ID: <span className="font-bold text-emerald-600">{successTrackingId}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessTrackingId(null)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {divisionCards.map((card) => {
          const isActive = formData.division === card.title;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => handleDivisionSelect(card.title)}
              className={`text-left bg-white rounded-3xl border shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                isActive ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'
              }`}
            >
              <div className="bg-indigo-600 px-6 py-5 text-white">
                <h2 className="text-xl font-bold">{card.title} Division</h2>
                <p className="text-indigo-100 text-sm mt-1">{card.description}</p>
              </div>
              <div className="p-6 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tap once to auto-fill the division and jump to the complaint form.
                </p>
                <span className="shrink-0 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20">
                  Lodge Complaint
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        ref={formRef}
        className={`bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden transition-all duration-500 ${
          isFormHighlighted ? 'border-indigo-300 ring-4 ring-indigo-100' : 'border-slate-100'
        }`}
      >
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} />
            Submit Complaint
          </h2>
          <p className="text-indigo-100 text-sm mt-1">Simple, guided complaint flow for quick student reporting.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {errorMessage && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl flex items-center gap-3 border border-rose-100">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{errorMessage}</p>
            </div>
          )}

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Basic Info</h3>
                <p className="text-sm text-slate-500">We’ve pre-filled the essentials to keep this fast.</p>
              </div>
            </div>

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
                  {user?.class || '10-A'} / {user?.section || 'A'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Division
                </label>
                <select
                  value={formData.division}
                  onChange={(event) => setFormData((current) => ({ ...current, division: event.target.value as ComplaintDivision }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-indigo-300 bg-slate-50/50 transition-all outline-none"
                >
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} /> Date
                </label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {formData.createdAt}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <School size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Complaint Details</h3>
                <p className="text-sm text-slate-500">Pick the authority, choose a type, and explain the issue clearly.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Complaint Title
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short complaint title"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-indigo-300 bg-slate-50/50 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} /> Send To
                </label>
                <select
                  value={formData.sendTo}
                  onChange={(event) => setFormData((current) => ({ ...current, sendTo: event.target.value as SendToOption }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-indigo-300 bg-slate-50/50 transition-all outline-none"
                >
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Subject Teacher">Subject Teacher</option>
                  <option value="Governing Body">Governing Body</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} /> Complaint Type
              </label>
              <div className="flex flex-wrap gap-3">
                {complaintTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, type }))}
                    className={`px-4 py-2.5 rounded-full text-sm font-bold border transition-all ${
                      formData.type === type
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} /> Complaint Description
                  </label>
                  <span className={`text-xs font-bold ${formData.description.length > MAX_DESCRIPTION_LENGTH - 40 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the issue in simple words..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-indigo-300 bg-slate-50/50 transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Flag size={14} /> Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value as ComplaintPriority }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 hover:border-indigo-300 bg-slate-50/50 transition-all outline-none"
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-slate-600">
                <p>Complaint will be sent to the selected authority automatically.</p>
                <p>Status can be tracked in <span className="font-bold text-slate-800">My Complaints</span>.</p>
                <p>Notification will be shown when resolved.</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Send size={18} />
            {isSubmitting ? 'Submitting Complaint...' : 'Submit Complaint'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">My Complaints</h2>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Title</th>
                  <th className="px-6 py-4 border-b border-slate-100">Type</th>
                  <th className="px-6 py-4 border-b border-slate-100">Status</th>
                  <th className="px-6 py-4 border-b border-slate-100">Date</th>
                </tr>
              </thead>
              <tbody>
                {studentComplaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{complaint.title}</p>
                        {complaint.response && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{complaint.response}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{complaint.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                        complaint.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {complaint.status === 'OPEN' ? 'Pending' : 'Resolved'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {studentComplaints.length === 0 && (
            <div className="py-12 text-center bg-slate-50 border-t border-slate-100">
              <p className="text-slate-400 font-medium uppercase tracking-widest">No complaints submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintForm;
