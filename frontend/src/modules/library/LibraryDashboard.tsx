import { useEffect, useMemo, useState } from 'react';
import { BookOpen, BookCheck, AlertCircle, Search, Plus, Filter, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { createBook, createIssueRecord, fetchBooks, fetchLibraryIssues, fetchStudents, type LibraryBook, type LibraryIssue, type LibraryStudent } from '../../services/erpContent';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) {
      return message;
    }
  }

  return fallback;
};

const LibraryDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState<LibraryStudent[]>([]);
  const [issueBookTarget, setIssueBookTarget] = useState<LibraryBook | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issuedBooks, setIssuedBooks] = useState<LibraryIssue[]>([]);
  const [isIssuedModalOpen, setIsIssuedModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBooks = async () => {
      try {
        setIsLoading(true);
        const [data, studentData, issueData] = await Promise.all([fetchBooks(), fetchStudents(), fetchLibraryIssues()]);
        if (isMounted) {
          setBooks(data);
          setStudents(studentData);
          setIssuedBooks(issueData);
        }
      } catch (error) {
        console.error('Failed to load library books:', error);
        if (isMounted) {
          setNotification('Unable to load the library catalog right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBooks();

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const filteredBooks = useMemo(() => books.filter((book) =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  ), [books, searchTerm]);

  const openIssueModal = (book: LibraryBook) => {
    if (book.availableCopies <= 0) {
      return;
    }

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    setIssueBookTarget(book);
    setSelectedStudent('');
    setDueDate(defaultDueDate.toISOString().slice(0, 10));
  };

  const handleIssueBook = async () => {
    if (!issueBookTarget || !selectedStudent || !dueDate) {
      showToast('Select a student and due date before issuing.');
      return;
    }

    try {
      await createIssueRecord(selectedStudent, issueBookTarget.id, dueDate);
      const refreshedIssues = await fetchLibraryIssues();
      setBooks((prev) => prev.map((entry) => entry.id === issueBookTarget.id ? {
        ...entry,
        availableCopies: Math.max(entry.availableCopies - 1, 0),
      } : entry));
      setIssuedBooks(refreshedIssues);
      setIssueBookTarget(null);
      showToast(`Successfully issued "${issueBookTarget.title}"!`);
    } catch (error) {
      console.error('Failed to issue book:', error);
      showToast(getErrorMessage(error, 'Could not issue the selected book.'));
    }
  };

  const handleAddBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const totalCopies = Number(formData.get('copies'));
      const newBook = await createBook({
        title: formData.get('title') as string,
        author: formData.get('author') as string,
        category: formData.get('category') as string,
        isbn: formData.get('isbn') as string,
        totalCopies,
        availableCopies: totalCopies,
      });
      setBooks((prev) => [newBook, ...prev]);
      setIsModalOpen(false);
      showToast(`"${newBook.title}" added to catalog!`);
    } catch (error) {
      console.error('Failed to add book:', error);
      showToast('Could not add the book to the catalog.');
    }
  };

  const activeIssuedBooks = useMemo(
    () => issuedBooks.filter((issue) => issue.status !== 'returned' && !issue.returned_at && !issue.returned_date),
    [issuedBooks]
  );
  const issuedCount = activeIssuedBooks.length;
  const unavailableCount = books.filter((book) => book.availableCopies === 0).length;

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Library Catalog</h1>
          <p className="text-slate-500 mt-1">Manage books, track issues, and monitor inventory.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
        >
          <Plus size={16} /> Add New Book
        </button>
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500">
            <CheckCircle size={20} />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Catalog', value: books.length.toString(), icon: BookOpen, color: 'bg-indigo-500' },
          { title: 'Currently Issued', value: issuedCount.toString(), icon: BookCheck, color: 'bg-blue-500', onClick: () => setIsIssuedModalOpen(true) },
          { title: 'Unavailable Titles', value: unavailableCount.toString(), icon: AlertCircle, color: 'bg-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={stat.onClick}
              className={`flex w-full items-center gap-4 text-left ${stat.onClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
            <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition-all outline-none"
              placeholder="Search catalog..."
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors w-full sm:w-auto">
            <Filter size={16} /> Filters
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-slate-500">Loading catalog...</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 uppercase text-slate-500 text-xs font-semibold z-10">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Book Reference</th>
                  <th className="px-6 py-4 border-b border-slate-100">Category</th>
                  <th className="px-6 py-4 border-b border-slate-100">Availability</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-14 bg-indigo-100 rounded flex items-center justify-center border border-indigo-200">
                          <BookOpen size={20} className="text-indigo-400" />
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block text-base group-hover:text-indigo-700 transition-colors">{book.title}</span>
                          <span className="text-sm text-slate-500 block">by {book.author}</span>
                          <span className="text-xs text-slate-400 font-mono mt-1 block">ISBN {book.isbn}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{book.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`font-semibold ${book.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {book.availableCopies} available
                        </span>
                        <span className="text-slate-500 text-xs block mt-0.5">out of {book.totalCopies}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        disabled={book.availableCopies === 0}
                        onClick={() => openIssueModal(book)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:text-slate-700 rounded-xl font-medium transition-colors shadow-sm text-sm active:scale-95"
                      >
                        Issue Book
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Resource">
        <form onSubmit={handleAddBook} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Book Title</label>
            <input name="title" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="e.g. Brief History of Time" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Author Name</label>
            <input name="author" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="Stephen Hawking" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Category</label>
              <select name="category" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all">
                <option>Science</option>
                <option>Maths</option>
                <option>History</option>
                <option>Literature</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Total Copies</label>
              <input name="copies" type="number" defaultValue={1} min={1} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">ISBN Code</label>
            <input name="isbn" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-mono transition-all" placeholder="978-X-XX-XXXXXX" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Add to Catalog</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!issueBookTarget} onClose={() => setIssueBookTarget(null)} title={issueBookTarget ? `Issue: ${issueBookTarget.title}` : 'Issue Book'}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Student</label>
            <select
              value={selectedStudent}
              onChange={(event) => setSelectedStudent(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.rollNo ? `(Roll ${student.rollNo})` : ''} {student.sectionName ? `- ${student.sectionName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIssueBookTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => void handleIssueBook()} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-700">Issue Book</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isIssuedModalOpen} onClose={() => setIsIssuedModalOpen(false)} title="Currently Issued Books">
        <div className="space-y-3">
          {activeIssuedBooks.length ? activeIssuedBooks.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{issue.book?.title || 'Unknown book'}</p>
                  <p className="mt-1 text-sm text-slate-500">by {issue.book?.author || 'Unknown author'}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Issued
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Student</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{issue.student?.name || 'Unknown student'}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Roll / Section</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {issue.student?.rollNo || '-'} {issue.student?.sectionName ? `• ${issue.student.sectionName}` : ''}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Issued On</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{issue.issue_date}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Due Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{issue.due_date}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              No active issued books right now.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LibraryDashboard;
