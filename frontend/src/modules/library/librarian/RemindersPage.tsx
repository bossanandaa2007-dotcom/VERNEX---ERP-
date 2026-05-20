import { useEffect, useState } from 'react';
import { fetchLibraryIssues, sendReturnReminders } from '../../../services/erpContent';

const RemindersPage = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('Please return the library book by the due date.');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchLibraryIssues();
      if (!mounted) return;
      setIssues(data.filter(i => !i.returned_at));
    })();
    return () => { mounted = false; };
  }, []);

  const send = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (!ids.length) return;
    await sendReturnReminders(ids, message);
    alert('Reminders sent');
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div>
        <h1 className="text-2xl font-bold">Reminders</h1>
        <p className="text-slate-500">Compose and send reminders for outstanding books.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100">
        <textarea className="w-full p-3 rounded-lg border border-slate-200" rows={3} value={message} onChange={(e)=>setMessage(e.target.value)} />
        <div className="mt-3 flex justify-end">
          <button onClick={send} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Send Reminders</button>
        </div>
      </div>

      <div className="space-y-3">
        {issues.map(i => (
          <div key={i.id} className="bg-white p-3 rounded-xl border flex items-center justify-between">
            <div>
              <div className="font-semibold">{i.book?.title}</div>
              <div className="text-sm text-slate-500">{i.student?.name} — Due {i.due_date}</div>
            </div>
            <div>
              <input type="checkbox" checked={!!selected[i.id]} onChange={(e)=>setSelected(s=>({...s,[i.id]:e.target.checked}))} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RemindersPage;
