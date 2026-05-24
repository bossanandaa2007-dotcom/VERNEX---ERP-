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
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useComplaintStore,
  type ComplaintDivision,
  type ComplaintPriority,
  type ComplaintType,
} from '../../store/useComplaintStore';
import { createComplaint, fetchComplaints } from '../../services/complaints';
import {
  fetchRecipientsForStudentContext,
  fetchStudentRoutingContext,
  type RecipientOption,
  type RecipientRouteType,
} from '../../services/recipientRouting';

const MAX_DESCRIPTION_LENGTH = 250;

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

const complaintTypes: ComplaintType[] = [
  'Academic',
  'Hostel',
  'Discipline',
  'Infrastructure',
  'Fees',
  'Transport',
  'Canteen',
  'Library',
  'Exam',
  'Bullying',
  'Health & Safety',
  'Cleanliness',
  'Other',
];
const priorities: ComplaintPriority[] = ['Low', 'Medium', 'High'];

const formatTrackingId = (complaintId: string) => complaintId.replace(/^cmp/i, 'CMP');

const ComplaintForm = () => {
  const { user } = useAuthStore();
  const { complaints, setComplaints, syncComplaint } = useComplaintStore();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const [successTrackingId, setSuccessTrackingId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [studentContext, setStudentContext] = useState<Awaited<ReturnType<typeof fetchStudentRoutingContext>>>(null);
  const [formData, setFormData] = useState({
    division: 'Boys' as ComplaintDivision,
    sendTo: 'Class Teacher' as RecipientRouteType,
    recipientId: '',
    title: '',
    description: '',
    type: 'Academic' as ComplaintType,
    priority: 'Medium' as ComplaintPriority,
    createdAt: new Date().toISOString().split('T')[0],
  });

  const allowedDivision = useMemo<ComplaintDivision | null>(() => {
    if (studentContext?.gender === 'Female') {
      return 'Girls';
    }

    if (studentContext?.gender === 'Male') {
      return 'Boys';
    }

    return null;
  }, [studentContext?.gender]);

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

    Promise.all([
      fetchComplaints({ studentId: user.id }),
      fetchStudentRoutingContext(user.id).then(async (context) => {
        setStudentContext(context);
        return context ? fetchRecipientsForStudentContext(context) : [];
      }),
    ])
      .then(([complaintRows, recipientRows]) => {
        setComplaints(complaintRows);
        setRecipients(recipientRows);
        setFormData((current) => {
          const nextRecipient =
            recipientRows.find((recipient) => recipient.routeType === current.sendTo)?.id ||
            recipientRows[0]?.id ||
            '';

          return {
            ...current,
            division: allowedDivision || current.division,
            recipientId: current.recipientId || nextRecipient,
          };
        });
      })
      .catch((error) => {
        console.error('Failed to fetch complaint context:', error);
      });
  }, [allowedDivision, setComplaints, user?.id]);

  useEffect(() => {
    if (!allowedDivision) {
      return;
    }

    setFormData((current) => ({ ...current, division: allowedDivision }));
  }, [allowedDivision]);

  const recipientOptions = useMemo(
    () => recipients.filter((recipient) => recipient.routeType === formData.sendTo),
    [formData.sendTo, recipients]
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

  useEffect(() => {
    if (!isFormHighlighted) {
      return;
    }

    const timer = window.setTimeout(() => setIsFormHighlighted(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isFormHighlighted]);

  const handleDivisionSelect = (division: ComplaintDivision) => {
    if (allowedDivision && division !== allowedDivision) {
      return;
    }

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

    const selectedRecipient = recipientOptions.find((recipient) => recipient.id === formData.recipientId);
    if (!selectedRecipient) {
      setErrorMessage('Please choose a valid complaint recipient.');
      setIsSubmitting(false);
      return;
    }

    if (allowedDivision && formData.division !== allowedDivision) {
      setErrorMessage(`Complaints for this student must go through the ${allowedDivision} division.`);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      studentId: user.id,
      studentName: studentContext?.name || user.name || 'Student',
      class: studentContext?.className || user.class || '10-A',
      section: studentContext?.className?.split('-')[1] || user.section || 'A',
      division: formData.division,
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: formData.type,
      targetId: selectedRecipient.id,
      targetRole: selectedRecipient.role,
      targetType: selectedRecipient.routeType,
      priority: formData.priority,
    };

    try {
      const savedComplaint = await createComplaint(payload);
      syncComplaint(savedComplaint);
      setSuccessTrackingId(formatTrackingId(savedComplaint.id));

      setFormData((current) => ({
        ...current,
        title: '',
        description: '',
        type: 'Academic',
        sendTo: 'Class Teacher',
        recipientId: recipients.find((recipient) => recipient.routeType === 'Class Teacher')?.id || '',
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
    <div className="erp-page mx-auto w-full max-w-[calc(100vw-1.5rem)] px-0.5 lg:max-w-6xl lg:px-0">
      {successTrackingId && (
        <div className="fixed inset-x-3 top-20 z-50 lg:inset-x-auto lg:right-6">
          <div className="rounded border border-emerald-100 bg-white p-4 shadow-lg lg:min-w-[290px] lg:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Complaint Submitted Successfully</p>
                <p className="text-sm text-slate-500 mt-1">Tracking ID: <span className="font-bold text-emerald-600">{successTrackingId}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessTrackingId(null)}
                className="text-slate-300 transition-colors hover:text-slate-500"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {divisionCards.map((card) => {
          const isActive = formData.division === card.title;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => handleDivisionSelect(card.title)}
              disabled={!!allowedDivision && allowedDivision !== card.title}
              className={`erp-card overflow-hidden text-left transition-shadow hover:shadow-md ${
                isActive ? 'border-blue-300 ring-2 ring-blue-100' : ''
              } ${allowedDivision && allowedDivision !== card.title ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 lg:px-6 lg:py-5">
                <h2 className="text-lg font-bold text-slate-900">{card.title} Division</h2>
                <p className="mt-1 text-sm text-slate-500">{card.description}</p>
              </div>
              <div className="flex flex-col gap-4 p-4 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between lg:p-6">
                <p className="text-sm leading-relaxed text-slate-500">
                  Tap once to auto-fill the division and jump to the complaint form.
                </p>
                <span className="erp-primary-button shrink-0 px-4 py-2.5 text-center text-sm lg:px-5">
                  Lodge Complaint
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        ref={formRef}
        className={`erp-card overflow-hidden transition-shadow ${
          isFormHighlighted ? 'border-blue-300 ring-2 ring-blue-100' : ''
        }`}
      >
        <div className="border-b border-slate-200 bg-slate-50 p-5 lg:p-6">
          <p className="erp-kicker">Submit Complaint</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileText size={24} />
            Submit Complaint
          </h2>
          <p className="erp-subtitle">Structured complaint flow for student reporting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 lg:space-y-8 lg:p-8">
          {errorMessage && (
            <div className="flex items-center gap-3 rounded border border-rose-100 bg-rose-50 p-4 text-rose-700">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{errorMessage}</p>
            </div>
          )}

          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-700">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Basic Info</h3>
                <p className="text-sm text-slate-500">We’ve pre-filled the essentials to keep this fast.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} /> Student Name
                </label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {studentContext?.name || user?.name}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} /> Class / Section
                </label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {studentContext?.className || user?.class || '10-A'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} /> Division
                </label>
                <select
                  value={formData.division}
                  onChange={(event) => setFormData((current) => ({ ...current, division: event.target.value as ComplaintDivision }))}
                  className="erp-input w-full px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={!!allowedDivision}
                >
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
                {allowedDivision && (
                  <p className="text-xs font-medium text-slate-500">
                    This student is restricted to the {allowedDivision} division based on the student profile.
                  </p>
                )}
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
              <div className="flex h-10 w-10 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-700">
                <School size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Complaint Details</h3>
                <p className="text-sm text-slate-500">Pick the authority, choose a type, and explain the issue clearly.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Complaint Title
                </label>
                <input
                  required
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short complaint title"
                  className="erp-input w-full px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} /> Send To
                </label>
                <select
                  value={formData.sendTo}
                  onChange={(event) => setFormData((current) => ({ ...current, sendTo: event.target.value as RecipientRouteType }))}
                  className="erp-input w-full px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Subject Teacher">Subject Teacher</option>
                  <option value="Governing Body">Governing Body</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <School size={14} /> Recipient
              </label>
              <select
                value={formData.recipientId}
                onChange={(event) => setFormData((current) => ({ ...current, recipientId: event.target.value }))}
                className="erp-input w-full px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={!recipientOptions.length}
              >
                {!recipientOptions.length && <option value="">No recipients available</option>}
                {recipientOptions.map((recipient) => (
                  <option key={`${recipient.routeType}-${recipient.id}`} value={recipient.id}>
                    {recipient.name}
                    {recipient.subjects.length ? ` - ${recipient.subjects.join(', ')}` : ''}
                  </option>
                ))}
              </select>
              {!recipientOptions.length && (
                <p className="text-xs font-medium text-amber-600">
                  No matching recipient was found for this student&apos;s section staffing.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} /> Complaint Type
              </label>
              <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 lg:flex lg:flex-wrap lg:gap-3">
                {complaintTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, type }))}
                    className={`rounded border px-3 py-2.5 text-sm font-bold transition-colors lg:px-4 ${
                      formData.type === type
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
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
                  className="erp-input w-full resize-none px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Flag size={14} /> Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value as ComplaintPriority }))}
                  className="erp-input w-full px-4 py-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

          <div className="rounded border border-blue-100 bg-blue-50/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
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
            className="erp-primary-button flex w-full items-center justify-center gap-2 px-6 py-3 transition-colors disabled:opacity-60"
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

        <div className="erp-table-wrap">
          <div className="space-y-3 bg-slate-50 p-3 md:hidden">
            {studentComplaints.map((complaint) => (
              <div key={complaint.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{complaint.title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{complaint.type} - {new Date(complaint.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`shrink-0 rounded px-2.5 py-1 text-[10px] font-bold uppercase ${
                    complaint.status === 'OPEN' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {complaint.status === 'OPEN' ? 'Pending' : 'Resolved'}
                  </span>
                </div>
                {complaint.response && <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{complaint.response}</p>}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                      <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${
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
              <p className="font-medium uppercase tracking-wide text-slate-400">No complaints submitted yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintForm;
