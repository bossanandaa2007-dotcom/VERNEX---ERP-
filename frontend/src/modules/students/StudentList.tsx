import { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Search, ChevronDown, Filter, Mail, Phone } from 'lucide-react';
import { useClassStore } from '../../store/useClassStore';
import type { IStudent } from '../../types/school';

type StudentRow = IStudent & {
  sectionName: string;
  categoryName: string;
};

const columnHelper = createColumnHelper<StudentRow>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Student Name',
    cell: (info) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0">
          {info.getValue().charAt(0)}
        </div>
        <div>
          <span className="font-semibold text-slate-900 block">{info.getValue()}</span>
          <span className="text-xs text-slate-500">{info.row.original.email || 'No email'}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('rollNo', {
    header: 'Roll No',
    cell: (info) => <span className="font-semibold text-slate-700">{info.getValue()}</span>,
  }),
  columnHelper.accessor('sectionName', {
    header: 'Class / Section',
    cell: (info) => <span className="text-slate-600 text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('categoryName', {
    header: 'Level',
    cell: (info) => (
      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('parentName', {
    header: 'Parent',
    cell: (info) => <span className="text-slate-600 text-xs">{info.getValue()}</span>,
  }),
  columnHelper.display({
    id: 'contact',
    header: 'Quick Contact',
    cell: (info) => (
      <div className="flex items-center gap-2">
        {info.row.original.email && (
          <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400" title={info.row.original.email}>
            <Mail size={14} />
          </button>
        )}
        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400" title={info.row.original.contact}>
          <Phone size={14} />
        </button>
      </div>
    ),
  }),
];

const StudentList = () => {
  const initialize = useClassStore((state) => state.initialize);
  const students = useClassStore((state) => state.students);
  const sections = useClassStore((state) => state.sections);
  const categories = useClassStore((state) => state.categories);
  const isLoading = useClassStore((state) => state.isLoading);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const data = useMemo<StudentRow[]>(() => {
    const sectionMap = new Map(sections.map((section) => [section.id, section]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return students
      .map((student) => {
        const section = sectionMap.get(student.sectionId);
        const category = categoryMap.get(student.categoryId);

        return {
          ...student,
          sectionName: section?.name || '-',
          categoryName: category?.name || '-',
        };
      })
      .filter((student) => categoryFilter === 'ALL' || student.categoryId === categoryFilter)
      .filter((student) => sectionFilter === 'ALL' || student.sectionName === sectionFilter);
  }, [categories, categoryFilter, sectionFilter, sections, students]);

  const filteredSections = useMemo(() => {
    return sections.filter((section) => categoryFilter === 'ALL' || section.categoryId === categoryFilter);
  }, [categoryFilter, sections]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase();
      return [
        row.original.name,
        row.original.rollNo,
        row.original.sectionName,
        row.original.categoryName,
        row.original.parentName,
      ].some((value) => value?.toLowerCase().includes(query));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Registry</h1>
          <p className="text-slate-500 mt-1">View student records in the same structured list format as faculty.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading && <div className="px-6 py-4 text-sm font-medium text-slate-500 border-b border-slate-100">Loading students...</div>}

        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition-all outline-none"
              placeholder="Search students..."
            />
          </div>
          <div className="flex w-full lg:w-auto items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setSectionFilter('ALL');
              }}
              className="flex-1 lg:flex-none px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <option value="ALL">All Levels</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="flex-1 lg:flex-none px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              <option value="ALL">All Sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.name}>{section.name}</option>
              ))}
            </select>
            <button className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 uppercase text-slate-500 text-xs font-semibold">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4 border-b border-slate-100 tracking-wider">
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${
                                header.column.getIsSorted() === 'asc'
                                  ? 'rotate-180 text-indigo-500'
                                  : header.column.getIsSorted() === 'desc'
                                    ? 'text-indigo-500'
                                    : 'text-slate-300'
                              }`}
                            />
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
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 group">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No students found based on query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
    </div>
  );
};

export default StudentList;
