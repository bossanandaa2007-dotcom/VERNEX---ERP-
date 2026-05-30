import { useEffect, useMemo, useState } from 'react';
import { Search, BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { fetchBooks, fetchStudents, createIssueRecord, createBook, updateBook, deleteBook, type LibraryBook } from '../../../services/erpContent';

const emptyBookForm = {
  title: '',
  author: '',
  category: '',
  isbn: '',
  totalCopies: '1',
  availableCopies: '1',
};

const BooksPage = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>('');
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [bookFormError, setBookFormError] = useState('');
  const [isSavingBook, setIsSavingBook] = useState(false);

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
                <div className="flex flex-col gap-2">
                  <button onClick={() => openIssue(book)} disabled={book.availableCopies===0} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm hover:bg-slate-50">Issue</button>
                  <button onClick={() => openEditBook(book)} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm hover:bg-slate-50">
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button onClick={() => void handleDeleteBook(book)} className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white border border-rose-100 text-rose-600 rounded-xl text-sm hover:bg-rose-50">
                    <Trash2 size={14} />
                    Delete
                  </button>
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
