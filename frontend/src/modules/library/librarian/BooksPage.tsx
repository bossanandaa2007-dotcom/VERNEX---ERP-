import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { fetchBooks, fetchStudents, createIssueRecord, type LibraryBook } from '../../../services/erpContent';

const BooksPage = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const bs = await fetchBooks();
      const st = await fetchStudents();
      if (!mounted) return;
      setBooks(bs);
      setStudents(st);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())), [books, search]);

  const openIssue = (book: LibraryBook) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    setSelectedStudent(null);
    setDueDate('');
  };

  const handleIssue = async () => {
    if (!selectedBook || !selectedStudent || !dueDate) return;
    try {
      await createIssueRecord(selectedStudent, selectedBook.id, dueDate);
      setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, availableCopies: Math.max(b.availableCopies - 1, 0) } : b));
      setIsModalOpen(false);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Books</h1>
          <p className="text-slate-500 mt-1">Search, filter and issue books to students.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books or author..." className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {filtered.map(book => (
            <div key={book.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-12 h-16 bg-indigo-100 rounded flex items-center justify-center"><BookOpen size={20} className="text-indigo-600"/></div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{book.title}</div>
                  <div className="text-sm text-slate-500">by {book.author}</div>
                  <div className="mt-2 text-sm"><span className={`font-semibold ${book.availableCopies>0?'text-emerald-600':'text-rose-600'}`}>{book.availableCopies} available</span> <span className="text-xs text-slate-400 ml-2">out of {book.totalCopies}</span></div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => openIssue(book)} disabled={book.availableCopies===0} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Issue</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBook ? `Issue: ${selectedBook.title}` : 'Issue Book'}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold">Student</label>
            <select value={selectedStudent||''} onChange={(e)=>setSelectedStudent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200">
              <option value="">Select student</option>
              {students.map(s=> <option key={s.id} value={s.id}>{s.name} {s.sectionName ? `- ${s.sectionName}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Due Date</label>
            <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button>
            <button onClick={handleIssue} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl">Issue Book</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BooksPage;
