import { useEffect, useState } from 'react';
import { fetchLibraryIssues, markIssueReturned } from '../../../services/erpContent';

const statusColor = (issue: any) => {
  if (issue.returned_at) return 'bg-emerald-100 text-emerald-700';
  const due = new Date(issue.due_date);
  const now = new Date();
  if (due < now) return 'bg-rose-100 text-rose-700';
  const soon = new Date();
  soon.setDate(now.getDate() + 3);
  if (due <= soon) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const IssuedBooksPage = () => {
  const [issues, setIssues] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await fetchLibraryIssues();
      if (!mounted) return;
      setIssues(data);
    })();
    return () => { mounted = false; };
  }, []);

  const markReturned = async (id: string) => {
    await markIssueReturned(id);
    setIssues(prev => prev.map(i => i.id === id ? { ...i, returned_at: new Date().toISOString().split('T')[0], status: 'Returned' } : i));
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issued Books</h1>
          <p className="text-slate-500">Track active issues, mark returns and send reminders.</p>
        </div>
      </div>

      <div className="space-y-3">
        {issues.map(issue => (
          <div key={issue.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input type="checkbox" checked={!!selected[issue.id]} onChange={(e)=>setSelected(s=>({...s,[issue.id]:e.target.checked}))} />
              <div>
                <div className="font-semibold">{issue.book?.title || 'Unknown'}</div>
                <div className="text-sm text-slate-500">Issued to {issue.student?.name || '—'} • Due {issue.due_date}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full ${statusColor(issue)} text-xs font-semibold`}>{issue.returned_at ? 'Returned' : (new Date(issue.due_date) < new Date() ? 'Overdue' : 'Active')}</div>
              {!issue.returned_at && <button onClick={()=>void markReturned(issue.id)} className="px-3 py-1 bg-white border rounded-xl">Mark Returned</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IssuedBooksPage;
