import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, Send } from 'lucide-react';
import {
  fetchLibraryIssues,
  fetchLibraryReminderHistory,
  fetchStudentByRollNo,
  sendReturnReminders,
  type LibraryIssue,
  type LibraryReminderHistory,
  type LibraryStudent,
} from '../../../services/erpContent';

const todayIso = () => new Date().toISOString().slice(0, 10);

const RemindersPage = () => {
  const [issues, setIssues] = useState<LibraryIssue[]>([]);
  const [cutoffDate, setCutoffDate] = useState(todayIso);
  const [message, setMessage] = useState('Please return the library book by the due date.');
  const [feedback, setFeedback] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [manualRollNo, setManualRollNo] = useState('');
  const [manualStudent, setManualStudent] = useState<LibraryStudent | null>(null);
  const [manualIssueId, setManualIssueId] = useState('');
  const [manualMessage, setManualMessage] = useState('Please return the issued library book.');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [history, setHistory] = useState<LibraryReminderHistory[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [data, reminderRows] = await Promise.all([fetchLibraryIssues(), fetchLibraryReminderHistory()]);
      if (!mounted) return;
      setIssues(data.filter((issue) => !issue.returned_at && issue.status !== 'returned'));
      setHistory(reminderRows);
    })();
    return () => { mounted = false; };
  }, []);

  const reminderTargets = useMemo(() => {
    if (!cutoffDate) return [];
    return issues
      .filter((issue) => issue.due_date <= cutoffDate)
      .sort((left, right) => left.due_date.localeCompare(right.due_date));
  }, [issues, cutoffDate]);

  const manualStudentIssues = useMemo(
    () => manualStudent ? issues.filter((issue) => issue.student_id === manualStudent.id) : [],
    [issues, manualStudent]
  );

  const refreshHistory = async () => setHistory(await fetchLibraryReminderHistory());

  const lookupManualStudent = async () => {
    setFeedback('');
    setManualStudent(null);
    setManualIssueId('');
    if (!manualRollNo.trim()) {
      setFeedback('Enter student roll number.');
      return;
    }
    try {
      setIsLookingUp(true);
      const student = await fetchStudentByRollNo(manualRollNo);
      setManualStudent(student);
      if (!student) setFeedback('No student found for this roll number.');
    } catch (error) {
      console.error('Failed to lookup student:', error);
      setFeedback('Could not fetch student.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const sendManual = async () => {
    setFeedback('');
    const issueIds = manualIssueId
      ? [manualIssueId]
      : manualStudentIssues.map((issue) => issue.id);

    if (!manualStudent) {
      setFeedback('Lookup a student first.');
      return;
    }
    if (!issueIds.length) {
      setFeedback('This student has no active issued books.');
      return;
    }
    if (!manualMessage.trim()) {
      setFeedback('Type a reminder note.');
      return;
    }

    try {
      setIsSending(true);
      await sendReturnReminders(issueIds, manualMessage.trim());
      setIssues((current) => current.map((issue) => (
        issueIds.includes(issue.id)
          ? { ...issue, reminderSent: true, reminderSentAt: new Date().toISOString(), reminderCount: (issue.reminderCount || 0) + 1 }
          : issue
      )));
      await refreshHistory();
      setFeedback(`Manual reminder sent to ${manualStudent.name}.`);
    } catch (error) {
      console.error('Failed to send manual reminder:', error);
      setFeedback('Could not send manual reminder.');
    } finally {
      setIsSending(false);
    }
  };

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
      setIssues((current) => current.map((issue) => (
        ids.includes(issue.id)
          ? { ...issue, reminderSent: true, reminderSentAt: new Date().toISOString(), reminderCount: (issue.reminderCount || 0) + 1 }
          : issue
      )));
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
        <div>
          <h2 className="font-semibold text-slate-900">Manual Student Reminder</h2>
          <p className="text-sm text-slate-500">Enter roll number, choose an active issue, and send a custom note.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
          <div>
            <label className="text-sm font-semibold text-slate-700">Student Roll No</label>
            <div className="mt-1 flex gap-2">
              <input value={manualRollNo} onChange={(event) => setManualRollNo(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" placeholder="e.g. 101" />
              <button onClick={lookupManualStudent} disabled={isLookingUp} className="rounded-xl bg-slate-900 px-3 py-2 text-white disabled:opacity-60" aria-label="Lookup student">
                <Search size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">Active Issue</label>
              <select value={manualIssueId} onChange={(event) => setManualIssueId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="">All active issued books</option>
                {manualStudentIssues.map((issue) => (
                  <option key={issue.id} value={issue.id}>{issue.book?.title || 'Unknown book'} - Due {issue.due_date}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {manualStudent ? (
                <>{manualStudent.name} {manualStudent.sectionName ? `- ${manualStudent.sectionName}` : ''}<br />{manualStudentIssues.length} active issue{manualStudentIssues.length === 1 ? '' : 's'}</>
              ) : 'Lookup result will appear here.'}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Reminder Note</label>
          <textarea value={manualMessage} onChange={(event) => setManualMessage(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-3" />
        </div>

        <button onClick={sendManual} disabled={isSending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-60 sm:w-auto">
          <Send size={16} /> {isSending ? 'Sending...' : 'Send Manual Reminder'}
        </button>
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

      <div className="bg-white p-4 rounded-2xl border border-slate-100">
        <h2 className="font-semibold text-slate-900">Reminder History</h2>
        <div className="mt-3 space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-semibold text-slate-900">{item.book?.title || 'Unknown book'}</div>
                <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {item.student?.name || 'Unknown student'}{item.student?.rollNo ? ` - Roll ${item.student.rollNo}` : ''}
              </div>
              <div className="mt-2 text-sm text-slate-700">{item.message}</div>
            </div>
          ))}
          {!history.length && <div className="text-sm text-slate-500">No reminder history yet.</div>}
        </div>
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
              <div className="text-xs text-slate-500">{issue.reminderCount || 0} reminder{(issue.reminderCount || 0) === 1 ? '' : 's'}</div>
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
