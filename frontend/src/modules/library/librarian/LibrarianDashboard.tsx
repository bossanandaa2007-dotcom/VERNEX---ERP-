import { useEffect, useState } from 'react';
import { Bell, BookOpen, Clock, Search } from 'lucide-react';
import {
  createIssueRecord,
  fetchBooks,
  fetchLibraryIssues,
  fetchStudentByRollNo,
  type LibraryBook,
  type LibraryStudent,
} from '../../../services/erpContent';

const LibrarianDashboard = () => {
  const [bookCount, setBookCount] = useState(0);
  const [issuedCount, setIssuedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [allBooks, setAllBooks] = useState<LibraryBook[]>([]);

  const [rollNo, setRollNo] = useState('');
  const [studentLookup, setStudentLookup] = useState<LibraryStudent | null>(null);
  const [isLookingUpStudent, setIsLookingUpStudent] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [quickMsg, setQuickMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const books = await fetchBooks();
        const issues = await fetchLibraryIssues();
        if (!mounted) return;
        setBookCount(books.length);
        setIssuedCount(issues.filter((issue) => issue.status === 'Issued').length);
        const now = new Date();
        setOverdueCount(issues.filter((issue) => !issue.returned_at && new Date(issue.due_date) < now).length);
        setAllBooks(books);
      } catch (error) {
        console.error('Failed to load librarian dashboard:', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const normalizedRollNo = rollNo.trim();

    if (!normalizedRollNo) {
      setStudentLookup(null);
      setQuickMsg(null);
      return;
    }

    let active = true;
    setIsLookingUpStudent(true);

    const lookupTimer = window.setTimeout(async () => {
      try {
        const student = await fetchStudentByRollNo(normalizedRollNo);
        if (!active) return;
        setStudentLookup(student);
        setQuickMsg(student ? null : 'No student found for this roll number.');
      } catch (error) {
        if (!active) return;
        console.error('Failed to fetch student by roll number:', error);
        setStudentLookup(null);
        setQuickMsg('Could not fetch student details.');
      } finally {
        if (active) setIsLookingUpStudent(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(lookupTimer);
    };
  }, [rollNo]);

  const handleQuickIssue = async () => {
    setQuickMsg(null);

    if (!rollNo.trim()) {
      setQuickMsg('Please enter student roll number.');
      return;
    }

    if (!studentLookup) {
      setQuickMsg('Student not found for the provided roll number.');
      return;
    }

    const bookToUse = allBooks.find((book) => book.id === selectedBookId);
    if (!bookToUse) {
      setQuickMsg('Please select a book.');
      return;
    }

    if (bookToUse.availableCopies <= 0) {
      setQuickMsg('No copies available for the selected book.');
      return;
    }

    try {
      await createIssueRecord(studentLookup.id, bookToUse.id, dueDate);
      setQuickMsg(`Issued "${bookToUse.title}" to ${studentLookup.name}.`);
      setIssuedCount((count) => count + 1);
      setAllBooks((prev) => prev.map((book) => (
        book.id === bookToUse.id
          ? { ...book, availableCopies: Math.max(0, book.availableCopies - 1) }
          : book
      )));
      setSelectedBookId('');
      setStudentLookup(null);
      setRollNo('');
    } catch (error) {
      console.error('Failed to issue book:', error);
      setQuickMsg('Failed to issue book. Try again.');
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

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900">Quick Issue</h3>
        <p className="text-sm text-slate-500">Enter a student roll number, verify the student, then select a book to issue.</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-600">Student Roll No</label>
            <input
              value={rollNo}
              onChange={(event) => setRollNo(event.target.value)}
              placeholder="e.g. 101"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Book</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <select
                value={selectedBookId}
                onChange={(event) => setSelectedBookId(event.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Select book</option>
                {allBooks.map((book) => (
                  <option key={book.id} value={book.id} disabled={book.availableCopies <= 0}>
                    {book.title} - {book.author} ({book.availableCopies} available)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>
        </div>

        {rollNo.trim() && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            {isLookingUpStudent ? (
              <span className="text-slate-500">Fetching student details...</span>
            ) : studentLookup ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <div className="text-xs text-slate-500">Student</div>
                  <div className="font-semibold text-slate-900">{studentLookup.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Roll No</div>
                  <div className="font-semibold text-slate-900">{studentLookup.rollNo}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Class</div>
                  <div className="font-semibold text-slate-900">{studentLookup.sectionName || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Email</div>
                  <div className="font-semibold text-slate-900 break-all">{studentLookup.email}</div>
                </div>
              </div>
            ) : (
              <span className="text-rose-600">No matching student found.</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleQuickIssue}
            disabled={isLookingUpStudent}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-60"
          >
            Issue
          </button>
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
