import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { fetchLibraryIssues, markIssueReturned, sendReturnReminders, type LibraryIssue } from '../../../services/erpContent';

const todayIso = () => new Date().toISOString().slice(0, 10);

const issueStatus = (issue: LibraryIssue) => {
  if (issue.status === 'returned' || issue.returned_at || issue.returned_date) return 'returned';
  if (issue.due_date < todayIso()) return 'overdue';
  if (issue.reminderSent || issue.status === 'reminder_sent') return 'reminder_sent';
  return 'issued';
};

const statusClass = (status: string) => {
  if (status === 'returned') return 'bg-emerald-100 text-emerald-700';
  if (status === 'overdue') return 'bg-rose-100 text-rose-700';
  if (status === 'reminder_sent') return 'bg-indigo-100 text-indigo-700';
  return 'bg-slate-100 text-slate-700';
};

const IssuedBooksPage = () => {
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [feedback, setFeedback] = useState('');
  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<LibraryIssue | null>(null);

  const loadIssues = async () => {
    const data = await fetchLibraryIssues();
    setIssues(data);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchLibraryIssues();
      if (mounted) setIssues(data);
    })();
    return () => { mounted = false; };
  }, []);

  const sortedIssues = useMemo(
    () => issues.slice().sort((left, right) => (
      right.issue_date.localeCompare(left.issue_date) || right.due_date.localeCompare(left.due_date)
    )),
    [issues]
  );

  const markReturned = async (issue: LibraryIssue) => {
    setFeedback('');
    setBusyIssueId(issue.id);
    try {
      await markIssueReturned(issue.id);
      await loadIssues();
      setFeedback(`"${issue.book?.title || 'Book'}" marked as returned.`);
    } catch (error) {
      console.error('Failed to mark returned:', error);
      setFeedback('Could not mark this book as returned.');
    } finally {
      setBusyIssueId(null);
    }
  };

  const sendReminder = async (issue: LibraryIssue) => {
    setFeedback('');
    setBusyIssueId(issue.id);
    try {
      await sendReturnReminders([issue.id], 'Please return the issued library book.');
      await loadIssues();
      setFeedback(`Reminder sent to ${issue.student?.name || 'student'}.`);
    } catch (error) {
      console.error('Failed to send reminder:', error);
      setFeedback('Could not send reminder.');
    } finally {
      setBusyIssueId(null);
    }
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div>
        <h1 className="text-2xl font-bold">Issued Books</h1>
        <p className="text-slate-500">Live issue tracker, overdue list, reminder center and issue history.</p>
      </div>

      {feedback && <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">{feedback}</div>}

      <div className="space-y-3">
        {sortedIssues.map((issue) => {
          const status = issueStatus(issue);
          const isClosed = status === 'returned';
          const isBusy = busyIssueId === issue.id;

          return (
            <div key={issue.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{issue.book?.title || 'Unknown book'}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {issue.student?.name || 'Unknown student'}
                    {issue.student?.rollNo ? ` - Roll ${issue.student.rollNo}` : ''}
                    {issue.student?.sectionName ? ` - ${issue.student.sectionName}` : ''}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">
                    <div><span className="block font-semibold text-slate-400">Issued</span>{issue.issue_date}</div>
                    <div><span className="block font-semibold text-slate-400">Due</span>{issue.due_date}</div>
                    <div><span className="block font-semibold text-slate-400">Returned</span>{issue.returned_date || issue.returned_at || '-'}</div>
                    <div><span className="block font-semibold text-slate-400">Reminders</span>{issue.reminderCount || 0}{issue.reminderSentAt ? ` - ${new Date(issue.reminderSentAt).toLocaleDateString()}` : ''}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                      onClick={() => setReturnTarget(issue)}
                    disabled={isBusy || isClosed}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> {isClosed ? 'Returned' : 'Mark Returned'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendReminder(issue)}
                    disabled={isBusy || isClosed}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} /> Send Reminder
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!sortedIssues.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No issue history yet.
          </div>
        )}
      </div>

      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Confirm Return</h2>
            <p className="mt-2 text-sm text-slate-500">
              Mark "{returnTarget.book?.title || 'this book'}" as returned for {returnTarget.student?.name || 'this student'}?
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setReturnTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button
                onClick={() => {
                  const issue = returnTarget;
                  setReturnTarget(null);
                  void markReturned(issue);
                }}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssuedBooksPage;
