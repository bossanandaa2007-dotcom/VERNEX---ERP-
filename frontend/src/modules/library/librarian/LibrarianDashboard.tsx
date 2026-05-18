import { useEffect, useState } from 'react';
import { BookOpen, Clock, Bell, Search } from 'lucide-react';
import { fetchBooks, fetchLibraryIssues, fetchStudents, createIssueRecord, createBook, type LibraryBook } from '../../../services/erpContent';

const LibrarianDashboard = () => {
  const [bookCount, setBookCount] = useState(0);
  const [issuedCount, setIssuedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const books = await fetchBooks();
        const issues = await fetchLibraryIssues();
        const students = await fetchStudents();
        if (!mounted) return;
        setBookCount(books.length);
        setIssuedCount(issues.filter((i) => i.status === 'Issued').length);
        const now = new Date();
        setOverdueCount(issues.filter((i) => !i.returned_at && new Date(i.due_date) < now).length);
        setAllBooks(books);
        setAllStudents(students);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [allBooks, setAllBooks] = useState<LibraryBook[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Quick-issue state
  const [rollNo, setRollNo] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LibraryBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!bookQuery) {
      setSuggestions([]);
      return;
    }

    const q = bookQuery.toLowerCase().trim();
    const matches = allBooks.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    setSuggestions(matches.slice(0, 6));
  }, [bookQuery, allBooks]);

  const handleQuickIssue = async () => {
    setQuickMsg(null);
    if (!rollNo.trim()) {
      setQuickMsg('Please enter student roll number.');
      return;
    }
    // find student by roll
    const student = allStudents.find(s => String(s.rollNo || s.roll_no || '').trim() === rollNo.trim());
    if (!student) {
      setQuickMsg('Student not found for the provided roll number.');
      return;
    }
    // Determine book: prefer explicit selectedBook, else try to match by exact title, else create a minimal book record
    let bookToUse: LibraryBook | null = selectedBook;

    if (!bookToUse) {
      const q = bookQuery.trim();
      if (!q) {
        setQuickMsg('Please provide a book name.');
        return;
      }

      const exact = allBooks.find(b => b.title.toLowerCase() === q.toLowerCase());
      if (exact) {
        bookToUse = exact;
      } else {
        // create a minimal book record so it can be issued immediately
        try {
          const newBook = await createBook({ title: q, author: 'Unknown', category: 'General', isbn: '', totalCopies: 1, availableCopies: 1 });
          setAllBooks(prev => [newBook, ...prev]);
          bookToUse = newBook;
        } catch (e) {
          console.error('Failed to create book for quick issue:', e);
          setQuickMsg('Could not create book record for issuance.');
          return;
        }
      }
    }

    try {
      await createIssueRecord(student.id, bookToUse.id, dueDate);
      setQuickMsg(`Issued "${bookToUse.title}" to ${student.name}.`);
      // update counts locally
      setIssuedCount((c) => c + 1);
      setAllBooks(prev => prev.map(b => b.id === bookToUse!.id ? { ...b, availableCopies: Math.max(0, b.availableCopies - 1) } : b));
      setSelectedBook(null);
      setBookQuery('');
      setRollNo('');
      setSuggestions([]);
    } catch (err) {
      setQuickMsg('Failed to issue book. Try again.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Librarian Dashboard</h1>
          <p className="text-slate-500 mt-1">Quick operational overview for library workflows.</p>
        </div>
      </div>
      {/* Quick Issue Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900">Quick Issue</h3>
        <p className="text-sm text-slate-500">Enter student roll no and select a book to quickly issue.</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-600">Student Roll No</label>
            <input value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="e.g. 101" className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>

          <div className="sm:col-span-1">
            <label className="text-xs text-slate-600">Book (title or author)</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input value={bookQuery} onChange={(e) => { setBookQuery(e.target.value); setSelectedBook(null); }} placeholder="Start typing book title..." className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200" />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-11 bg-white border border-slate-200 rounded-xl shadow-md z-40 max-h-56 overflow-auto">
                  {suggestions.map(s => (
                    <button key={s.id} onClick={() => { setSelectedBook(s); setBookQuery(s.title); setSuggestions([]); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">{s.title} — <span className="text-slate-400 text-xs">{s.author}</span></button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button onClick={handleQuickIssue} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Issue</button>
          <div className="text-sm text-slate-500">{quickMsg}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-100 text-indigo-700"><BookOpen size={20} /></div>
          <div>
            <div className="text-sm text-slate-500">Total Titles</div>
            <div className="text-2xl font-bold">{bookCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-100 text-amber-700"><Clock size={20} /></div>
          <div>
            <div className="text-sm text-slate-500">Currently Issued</div>
            <div className="text-2xl font-bold">{issuedCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-rose-100 text-rose-700"><Bell size={20} /></div>
          <div>
            <div className="text-sm text-slate-500">Overdue</div>
            <div className="text-2xl font-bold text-rose-600">{overdueCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
