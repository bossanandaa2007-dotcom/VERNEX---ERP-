import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { fetchBooks, fetchStudents, createIssueRecord, createBook, updateBook, deleteBook, type LibraryBook, type LibraryStudent } from '../../../services/erpContent';

const emptyBookForm = {
  title: '',
  author: '',
  category: '',
  isbn: '',
  totalCopies: '1',
  availableCopies: '1',
};

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

const BooksPage = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [students, setStudents] = useState<LibraryStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [bookFormError, setBookFormError] = useState('');
  const [issueError, setIssueError] = useState('');
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isIssuingBook, setIsIssuingBook] = useState(false);
  const [openMenuBookId, setOpenMenuBookId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const bs = await fetchBooks();
        const st = await fetchStudents();
        if (!mounted) return;
        setBooks(bs);
        setStudents(st);
      } catch (error) {
        console.error('Failed to load library books:', error);
        if (mounted) {
          setIssueError('Could not load library data.');
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!openMenuBookId) return;
    const closeMenu = () => setOpenMenuBookId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [openMenuBookId]);

  const filtered = useMemo(() => books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())), [books, search]);

  const openIssue = (book: LibraryBook) => {
    setSelectedBook(book);
    setIsModalOpen(true);
    setSelectedStudent(null);
    setIssueError('');
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 21);
    setDueDate(nextDueDate.toISOString().slice(0, 10));
    setOpenMenuBookId(null);
  };

  const handleIssue = async () => {
    setIssueError('');
    if (!selectedBook || !selectedStudent || !dueDate) {
      setIssueError('Choose a student before issuing this book.');
      return;
    }
    try {
      setIsIssuingBook(true);
      await createIssueRecord(selectedStudent, selectedBook.id, dueDate);
      setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, availableCopies: Math.max(b.availableCopies - 1, 0) } : b));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to issue book:', error);
      setIssueError(getErrorMessage(error, 'Could not issue this book.'));
    } finally {
      setIsIssuingBook(false);
    }
  };

  const openAddBook = () => {
    setEditingBook(null);
    setBookForm(emptyBookForm);
    setBookFormError('');
    setIsBookModalOpen(true);
  };

  const openEditBook = (book: LibraryBook) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      isbn: book.isbn,
      totalCopies: String(book.totalCopies),
      availableCopies: String(book.availableCopies),
    });
    setBookFormError('');
    setIsBookModalOpen(true);
    setOpenMenuBookId(null);
  };

  const updateBookForm = (field: keyof typeof emptyBookForm, value: string) => {
    setBookForm((current) => ({ ...current, [field]: value }));
    setBookFormError('');
  };

  const handleSaveBook = async () => {
    const title = bookForm.title.trim();
    const author = bookForm.author.trim();
    const category = bookForm.category.trim();
    const isbn = bookForm.isbn.trim();
    const totalCopies = Number(bookForm.totalCopies);
    const availableCopies = Number(bookForm.availableCopies);

    if (!title || !author || !category) {
      setBookFormError('Title, author and category are required.');
      return;
    }

    if (!Number.isInteger(totalCopies) || totalCopies < 1) {
      setBookFormError('Total copies must be at least 1.');
      return;
    }

    if (!Number.isInteger(availableCopies) || availableCopies < 0 || availableCopies > totalCopies) {
      setBookFormError('Available copies must be between 0 and total copies.');
      return;
    }

    try {
      setIsSavingBook(true);
      const payload = {
        title,
        author,
        category,
        isbn,
        totalCopies,
        availableCopies,
      };
      const savedBook = editingBook
        ? await updateBook(editingBook.id, payload)
        : await createBook(payload);

      setBooks((current) => (
        editingBook
          ? current.map((book) => (book.id === savedBook.id ? savedBook : book))
          : [savedBook, ...current]
      ));
      setIsBookModalOpen(false);
      setEditingBook(null);
      setBookForm(emptyBookForm);
    } catch (error) {
      console.error('Failed to save book:', error);
      setBookFormError('Could not save this book. Check if the ISBN already exists.');
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleDeleteBook = async (book: LibraryBook) => {
    const shouldDelete = window.confirm(`Delete "${book.title}"? Books with issue records may be protected.`);
    if (!shouldDelete) return;

    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('Could not delete this book. It may already have issued records.');
    }
  };

  return (
    <div className="space-y-6 lg:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Books</h1>
          <p className="text-slate-500 mt-1">Search, filter and issue books to students.</p>
        </div>
        <button
          onClick={openAddBook}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Book
        </button>
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuBookId((current) => current === book.id ? null : book.id);
                    }}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                    aria-label={`Actions for ${book.title}`}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {openMenuBookId === book.id && (
                    <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button type="button" onClick={() => openIssue(book)} disabled={book.availableCopies===0} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:text-slate-300">Issue</button>
                      <button type="button" onClick={() => openEditBook(book)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <Pencil size={14} /> Edit
                      </button>
                      <button type="button" onClick={() => void handleDeleteBook(book)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No books found.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isBookModalOpen} onClose={() => setIsBookModalOpen(false)} title={editingBook ? 'Edit Book' : 'Add Book'}>
        <div className="space-y-4">
          {bookFormError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {bookFormError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">Title</label>
              <input
                value={bookForm.title}
                onChange={(event) => updateBookForm('title', event.target.value)}
                placeholder="Book title"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Author</label>
              <input
                value={bookForm.author}
                onChange={(event) => updateBookForm('author', event.target.value)}
                placeholder="Author name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Category</label>
              <input
                value={bookForm.category}
                onChange={(event) => updateBookForm('category', event.target.value)}
                placeholder="Science, Fiction, Reference"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">ISBN</label>
              <input
                value={bookForm.isbn}
                onChange={(event) => updateBookForm('isbn', event.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Total Copies</label>
              <input
                type="number"
                min="1"
                value={bookForm.totalCopies}
                onChange={(event) => updateBookForm('totalCopies', event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Available Copies</label>
              <input
                type="number"
                min="0"
                value={bookForm.availableCopies}
                onChange={(event) => updateBookForm('availableCopies', event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsBookModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button>
            <button
              onClick={handleSaveBook}
              disabled={isSavingBook}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-60"
            >
              {isSavingBook ? 'Saving...' : editingBook ? 'Save Changes' : 'Add Book'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedBook ? `Issue: ${selectedBook.title}` : 'Issue Book'}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold">Student</label>
            <select value={selectedStudent||''} onChange={(e)=>setSelectedStudent(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200">
              <option value="">Select student</option>
              {students.map(s=> <option key={s.id} value={s.id}>{s.name} {s.sectionName ? `- ${s.sectionName}` : ''}</option>)}
            </select>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Return due date: <span className="font-semibold text-slate-900">{dueDate}</span>
          </div>
          {issueError && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {issueError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setIsModalOpen(false)} disabled={isIssuingBook} className="flex-1 px-4 py-2 border rounded-xl disabled:opacity-60">Cancel</button>
            <button onClick={handleIssue} disabled={isIssuingBook} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl disabled:opacity-60">
              {isIssuingBook ? 'Issuing...' : 'Issue Book'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BooksPage;
