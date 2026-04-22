import { useState } from 'react';
import { BookOpen, BookCheck, AlertCircle, Search, Plus, Filter, CheckCircle } from 'lucide-react';
import { mockBooks } from '../../mock-data';
import Modal from '../../components/common/Modal';

const LibraryDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [books, setBooks] = useState(mockBooks);
  const [notification, setNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIssueBook = (id: string) => {
    const book = books.find(b => b.id === id);
    if (book && book.availableCopies > 0) {
      setBooks(prev => prev.map(b => b.id === id ? { ...b, availableCopies: b.availableCopies - 1 } : b));
      setNotification(`Successfully issued "${book.title}"!`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleAddBook = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBook = {
      id: `b${books.length + 1}`,
      title: formData.get('title') as string,
      author: formData.get('author') as string,
      category: formData.get('category') as string,
      isbn: formData.get('isbn') as string,
      totalCopies: Number(formData.get('copies')),
      availableCopies: Number(formData.get('copies')),
      status: 'Available'
    };
    setBooks([newBook, ...books]);
    setIsModalOpen(false);
    setNotification(`"${newBook.title}" added to catalog!`);
    setTimeout(() => setNotification(null), 3000);
  };

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
          { title: 'Currently Issued', value: '2', icon: BookCheck, color: 'bg-blue-500' },
          { title: 'Overdue Returns', value: '1', icon: AlertCircle, color: 'bg-rose-500' },
        ].map((stat, i) => (
           <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
             <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                <stat.icon size={24} />
              </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        {/* Toolbar */}
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

        {/* Table */}
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
                       onClick={() => handleIssueBook(book.id)}
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
    </div>
  );
};
export default LibraryDashboard;
