import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Send } from 'lucide-react';
import { fetchLibraryIssues, sendReturnReminders, type LibraryIssue } from '../../../services/erpContent';

const todayIso = () => new Date().toISOString().slice(0, 10);

const RemindersPage = () => {
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [cutoffDate, setCutoffDate] = useState(todayIso);
  const [message, setMessage] = useState('Please return the library book by the due date.');
  const [feedback, setFeedback] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchLibraryIssues();
      if (!mounted) return;
      setIssues(data.filter((issue) => !issue.returned_at && issue.status === 'Issued'));
    })();
    return () => { mounted = false; };
  }, []);

  const reminderTargets = useMemo(() => {
    if (!cutoffDate) return [];
    return issues
      .filter((issue) => issue.due_date <= cutoffDate)
      .sort((left, right) => left.due_date.localeCompare(right.due_date));
  }, [issues, cutoffDate]);

  const send = async () => {
    setFeedback('');
    const ids = reminderTargets.map((issue) => issue.id);

    if (!cutoffDate) {
      setFeedback('Choose a cutoff date first.');
      return;
    }

    if (!ids.length) {
      setFeedback('No active issued books have due dates before the selected date.');
      return;
    }

    try {
      setIsSending(true);
      await sendReturnReminders(ids, message);
      setFeedback(`Reminders sent for ${ids.length} issued book${ids.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Failed to send library reminders:', error);
      setFeedback('Could not send reminders. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div>
        <h1 className="text-2xl font-bold">Reminders</h1>
        <p className="text-slate-500">Send reminders for active issued books due before a selected date.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Due Before</label>
            <div className="relative mt-1">
              <CalendarDays size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={cutoffDate}
                onChange={(event) => {
                  setCutoffDate(event.target.value);
                  setFeedback('');
                }}
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Message</label>
            <textarea
              className="mt-1 w-full p-3 rounded-xl border border-slate-200"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            {reminderTargets.length} active issue{reminderTargets.length === 1 ? '' : 's'} match due dates before {cutoffDate || 'the selected date'}.
          </div>
          <button
            onClick={send}
            disabled={isSending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60"
          >
            <Send size={16} />
            {isSending ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>

        {feedback && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {feedback}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {reminderTargets.map((issue) => (
          <div key={issue.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900">{issue.book?.title || 'Unknown book'}</div>
              <div className="text-sm text-slate-500">
                {issue.student?.name || 'Unknown student'}
                {issue.student?.rollNo ? ` - Roll ${issue.student.rollNo}` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase text-slate-400">Due Date</div>
              <div className="font-semibold text-slate-900">{issue.due_date}</div>
            </div>
          </div>
        ))}

        {!reminderTargets.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No matching issued books for the selected date.
          </div>
        )}
      </div>
    </div>
  );
};

export default RemindersPage;
