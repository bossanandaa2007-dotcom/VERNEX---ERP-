import { useState } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState
} from '@tanstack/react-table';
import { mockUsers } from '../../mock-data';
import { Search, ChevronDown, MoreVertical, Plus, Filter, Mail, Phone, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';

const teachersData: any[] = mockUsers.filter(u => u.role === 'Teacher');

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Teacher Name',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0">
          {info.getValue().charAt(0)}
        </div>
        <div>
          <span className="font-semibold text-slate-900 block">{info.getValue()}</span>
          <span className="text-xs text-slate-500">{info.row.original.email}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: info => <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{info.getValue() || 'General'}</span>,
  }),
  columnHelper.accessor('standards', {
    header: 'Classes Assigned',
    cell: info => <span className="text-slate-600 text-xs">{(info.getValue() as string[])?.join(', ') || 'N/A'}</span>,
  }),
  columnHelper.display({
    id: 'contact',
    header: 'Quick Contact',
    cell: () => (
      <div className="flex items-center gap-2">
        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400">
           <Mail size={14} />
        </button>
        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400">
           <Phone size={14} />
        </button>
      </div>
    )
  }),
  columnHelper.display({
    id: 'actions',
    cell: () => (
      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
        <MoreVertical size={16} />
      </button>
    )
  })
];

const TeacherList = () => {
  const [data, setData] = useState(() => [...teachersData]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleAddTeacher = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTeacher = {
      id: `u${mockUsers.length + 1}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: 'Teacher',
      subject: formData.get('subject') as string,
      standards: (formData.get('standards') as string).split(','),
      classes: (formData.get('standards') as string).split(','),
      password: "password123"
    };
    setData([newTeacher, ...data]);
    setIsModalOpen(false);
    setNotification(`${newTeacher.name} has been added to the faculty!`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Directory</h1>
          <p className="text-slate-500 mt-1">Manage teaching staff and access their academic profiles.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
           >
             <Plus size={16} /> Add Teacher
           </button>
        </div>
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
            <CheckCircle size={20} className="text-blue-400" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition-all outline-none"
              placeholder="Search faculty..."
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 uppercase text-slate-500 text-xs font-semibold">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 border-b border-slate-100 tracking-wider">
                      {header.isPlaceholder ? null : (
                        <div 
                          className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ChevronDown size={14} className={`transition-transform ${header.column.getIsSorted() === 'asc' ? 'rotate-180 text-indigo-500' : header.column.getIsSorted() === 'desc' ? 'text-indigo-500' : 'text-slate-300'}`} />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 group">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No faculty found based on query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Details */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm bg-slate-50/30">
           <span className="text-slate-500 font-medium">
             Showing {table.getRowModel().rows.length} records
           </span>
           <div className="flex gap-2">
             <button 
               onClick={() => table.previousPage()} 
               disabled={!table.getCanPreviousPage()}
               className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium text-slate-600 transition-colors shadow-sm"
             >
               Previous
             </button>
             <button 
               onClick={() => table.nextPage()} 
               disabled={!table.getCanNextPage()}
               className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium text-slate-600 transition-colors shadow-sm"
             >
               Next
             </button>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Faculty Member">
        <form onSubmit={handleAddTeacher} className="space-y-4">
           <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input name="name" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="Dr. Jane Smith" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Official Email</label>
              <input name="email" type="email" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="teacher@school.edu" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Primary Subject</label>
              <input name="subject" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="e.g. Physics, Biology" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Assigned Classes (Comma separated)</label>
              <input name="standards" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="10-A, 9-B, 11-C" />
            </div>
          <div className="pt-4 flex gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Cancel</button>
             <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Confirm Hire</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default TeacherList;
