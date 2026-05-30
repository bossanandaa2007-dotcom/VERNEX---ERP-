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
import { AlertTriangle, CheckCircle, Mail, Phone, Plus, Search, Shield, Trash2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useClassStore } from '../../store/useClassStore';
import type { ITeacher } from '../../types/school';
import type { TeacherManagementDetails, TeacherSubjectAssignmentDetail } from '../../services/schoolData';

const columnHelper = createColumnHelper<ITeacher>();

const getColumns = (onManage: (teacher: ITeacher) => void, onDelete: (teacher: ITeacher) => void) => [
  columnHelper.accessor('name', {
    header: 'Faculty',
    cell: (info) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 shadow-sm">
          {info.getValue().charAt(0)}
        </div>
        <div>
          <span className="block font-semibold text-slate-900">{info.getValue()}</span>
          <span className="text-xs text-slate-500">{info.row.original.email}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('subject', {
    header: 'Subjects',
    cell: (info) => {
      const subjects = info.row.original.subjects?.length ? info.row.original.subjects : [info.getValue()];
      return (
        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          {subjects.filter(Boolean).join(', ') || 'General'}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'staffing',
    header: 'Current Staffing',
    cell: (info) => {
      const teacher = info.row.original;
      const parts = [
        teacher.classTeacherOf ? `Class Teacher: ${teacher.classTeacherOf}` : null,
        teacher.subjectTeacherSections?.length ? `Subject Teacher: ${teacher.subjectTeacherSections.join(', ')}` : null,
      ].filter(Boolean);

      return <span className="text-xs text-slate-600">{parts.join(' | ') || 'Unassigned'}</span>;
    },
  }),
  columnHelper.display({
    id: 'contact',
    header: 'Contact',
    cell: () => (
      <div className="flex items-center gap-2">
        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
          <Mail size={14} />
        </button>
        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
          <Phone size={14} />
        </button>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Manage',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onManage(info.row.original)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <Shield size={14} />
          Manage
        </button>
        <button
          onClick={() => onDelete(info.row.original)}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    ),
  }),
];

const emptyTeacherForm = {
  name: '',
  email: '',
  category: '',
  subject: '',
  subjectsText: '',
  qualification: '',
  experience: '',
  contact: '',
  classTeacherSectionId: '',
  classTeacherSubject: '',
};

const TeacherList = () => {
  const initialize = useClassStore((state) => state.initialize);
  const teachers = useClassStore((state) => state.teachers);
  const categories = useClassStore((state) => state.categories);
  const addTeacher = useClassStore((state) => state.addTeacher);
  const deleteTeacher = useClassStore((state) => state.deleteTeacher);
  const fetchTeacherManagementDetails = useClassStore((state) => state.fetchTeacherManagementDetails);
  const updateTeacherRecord = useClassStore((state) => state.updateTeacherRecord);
  const addTeacherSubjectAssignment = useClassStore((state) => state.addTeacherSubjectAssignment);
  const removeTeacherSubjectAssignment = useClassStore((state) => state.removeTeacherSubjectAssignment);
  const isLoading = useClassStore((state) => state.isLoading);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [manageTeacher, setManageTeacher] = useState<ITeacher | null>(null);
  const [managementDetails, setManagementDetails] = useState<TeacherManagementDetails | null>(null);
  const [managementLoading, setManagementLoading] = useState(false);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
  const [selectedSubjectAssignment, setSelectedSubjectAssignment] = useState('');
  const [assignmentClassFilter, setAssignmentClassFilter] = useState('All');
  const [assignmentSubjectFilter, setAssignmentSubjectFilter] = useState('All');
  const [deleteCandidate, setDeleteCandidate] = useState<ITeacher | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const table = useReactTable({
    data: teachers,
    columns: getColumns(
      (teacher) => {
      setManageTeacher(teacher);
      setManagementDetails(null);
      setManagementError(null);
      setSelectedSubjectAssignment('');
      setAssignmentClassFilter('All');
      setAssignmentSubjectFilter('All');
      setManagementLoading(true);
        void fetchTeacherManagementDetails(teacher.id)
          .then((details) => {
            setManagementDetails(details);
            setTeacherForm({
              name: details.teacher.name,
              email: details.teacher.email,
              category: details.teacher.category,
              subject: details.teacher.subject || '',
              subjectsText: (details.teacher.subjects?.length ? details.teacher.subjects : [details.teacher.subject]).filter(Boolean).join(', '),
              qualification: details.teacher.qualification,
              experience: details.teacher.experience,
              contact: details.teacher.contact,
              classTeacherSectionId: details.currentClassTeacherSectionId || '',
              classTeacherSubject: details.teacher.homeSectionSubject || '',
            });
            setSelectedSubjectAssignment(details.availableSubjectAssignments[0]?.label || '');
          })
          .catch((error: any) => {
            console.error(error);
            setManagementError(error?.message || 'Unable to load faculty management details.');
          })
          .finally(() => setManagementLoading(false));
      },
      (teacher) => setDeleteCandidate(teacher)
    ),
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

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const closeManagementModal = () => {
    setManageTeacher(null);
    setManagementDetails(null);
    setManagementError(null);
    setManagementLoading(false);
    setTeacherForm(emptyTeacherForm);
    setSelectedSubjectAssignment('');
    setAssignmentClassFilter('All');
    setAssignmentSubjectFilter('All');
  };

  const reloadManagementDetails = async (teacherId: string) => {
    setManagementLoading(true);
    setManagementError(null);
    try {
      const details = await fetchTeacherManagementDetails(teacherId);
      setManagementDetails(details);
      setTeacherForm({
        name: details.teacher.name,
        email: details.teacher.email,
        category: details.teacher.category,
        subject: details.teacher.subject || '',
        subjectsText: (details.teacher.subjects?.length ? details.teacher.subjects : [details.teacher.subject]).filter(Boolean).join(', '),
        qualification: details.teacher.qualification,
        experience: details.teacher.experience,
        contact: details.teacher.contact,
        classTeacherSectionId: details.currentClassTeacherSectionId || '',
        classTeacherSubject: details.teacher.homeSectionSubject || '',
      });
      setSelectedSubjectAssignment(details.availableSubjectAssignments[0]?.label || '');
      setAssignmentClassFilter('All');
      setAssignmentSubjectFilter('All');
    } catch (error: any) {
      console.error(error);
      setManagementError(error?.message || 'Unable to refresh faculty details.');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleAddTeacher = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const primarySubject = String(formData.get('subject') || '').trim();
    const extraSubjects = String(formData.get('subjects') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const subjects = Array.from(new Set([primarySubject, ...extraSubjects].filter(Boolean)));

    await addTeacher({
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      subject: primarySubject,
      subjects,
      qualification: String(formData.get('qualification') || '').trim(),
      experience: String(formData.get('experience') || '').trim(),
      contact: String(formData.get('contact') || '').trim(),
      assignedClass: '',
      standards: [],
    });

    setIsAddModalOpen(false);
    showToast('Faculty member added. Staffing can now be assigned from the faculty list.');
  };

  const handleSaveTeacherProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manageTeacher) {
      return;
    }

    const subjects = Array.from(new Set(
      teacherForm.subjectsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ));

    try {
      setManagementLoading(true);
      setManagementError(null);
      await updateTeacherRecord(manageTeacher.id, {
        name: teacherForm.name.trim(),
        email: teacherForm.email.trim(),
        category: teacherForm.category,
        subject: teacherForm.subject.trim(),
        subjects,
        qualification: teacherForm.qualification.trim(),
        experience: teacherForm.experience.trim(),
        contact: teacherForm.contact.trim(),
        classTeacherSectionId: teacherForm.classTeacherSectionId || null,
        classTeacherSubject: teacherForm.classTeacherSectionId ? teacherForm.classTeacherSubject.trim() : null,
      });
      showToast('Faculty details updated.');
      await reloadManagementDetails(manageTeacher.id);
    } catch (error: any) {
      console.error(error);
      setManagementError(error?.message || 'Unable to save faculty details.');
      setManagementLoading(false);
    }
  };

  const handleAddSubjectAssignment = async () => {
    if (!manageTeacher || !managementDetails) {
      return;
    }

    const assignment = managementDetails.availableSubjectAssignments.find((option) => option.label === selectedSubjectAssignment);
    if (!assignment) {
      setManagementError('Choose an available subject-teacher slot first.');
      return;
    }

    try {
      setManagementLoading(true);
      setManagementError(null);
      await addTeacherSubjectAssignment(manageTeacher.id, assignment);
      showToast(`${manageTeacher.name} now handles ${assignment.subject} for ${assignment.className}.`);
      await reloadManagementDetails(manageTeacher.id);
    } catch (error: any) {
      console.error(error);
      setManagementError(error?.message || 'Unable to add subject-teacher assignment.');
      setManagementLoading(false);
    }
  };

  const handleRemoveSubjectAssignment = async (assignment: TeacherSubjectAssignmentDetail) => {
    if (!manageTeacher) {
      return;
    }

    try {
      setManagementLoading(true);
      setManagementError(null);
      await removeTeacherSubjectAssignment(manageTeacher.id, assignment.sectionId, assignment.subject);
      showToast(`${manageTeacher.name} was removed from ${assignment.subject} in ${assignment.className}.`);
      await reloadManagementDetails(manageTeacher.id);
    } catch (error: any) {
      console.error(error);
      setManagementError(error?.message || 'Unable to remove subject-teacher assignment.');
      setManagementLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteCandidate) {
      return;
    }

    try {
      setIsDeletingTeacher(true);
      await deleteTeacher(deleteCandidate.id);
      showToast(`${deleteCandidate.name} was deleted.`);
      setDeleteCandidate(null);
      if (manageTeacher?.id === deleteCandidate.id) {
        closeManagementModal();
      }
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || 'Unable to delete faculty member.');
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  const staffingSummary = useMemo(() => {
    if (!managementDetails) {
      return null;
    }

    return {
      classTeacher: managementDetails.teacher.classTeacherOf || 'Not assigned',
      subjectTeacher: managementDetails.currentSubjectAssignments.length
        ? managementDetails.currentSubjectAssignments.map((assignment) => `${assignment.className} - ${assignment.subject}`).join(', ')
        : 'Not assigned',
    };
  }, [managementDetails]);

  const assignmentClassOptions = useMemo(
    () => Array.from(new Set((managementDetails?.availableSubjectAssignments || []).map((option) => option.className)))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [managementDetails]
  );

  const assignmentSubjectOptions = useMemo(
    () => Array.from(new Set((managementDetails?.availableSubjectAssignments || [])
      .map((option) => option.subject)
      .filter(Boolean) as string[]
    )).sort((left, right) => left.localeCompare(right)),
    [managementDetails]
  );

  const filteredSubjectAssignments = useMemo(
    () => (managementDetails?.availableSubjectAssignments || []).filter((option) =>
      (assignmentClassFilter === 'All' || option.className === assignmentClassFilter) &&
      (assignmentSubjectFilter === 'All' || option.subject === assignmentSubjectFilter)
    ),
    [assignmentClassFilter, assignmentSubjectFilter, managementDetails]
  );

  useEffect(() => {
    if (!managementDetails) {
      return;
    }

    if (!filteredSubjectAssignments.length) {
      setSelectedSubjectAssignment('');
      return;
    }

    setSelectedSubjectAssignment((current) =>
      filteredSubjectAssignments.some((option) => option.label === current)
        ? current
        : filteredSubjectAssignments[0].label
    );
  }, [filteredSubjectAssignments, managementDetails]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Faculty Directory</h1>
          <p className="mt-1 text-slate-500">Add faculty first, then manage class-teacher and subject-teacher staffing from the faculty list.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus size={16} /> Add Faculty
        </button>
      </div>

      {notification && (
        <div className="fixed right-6 top-20 z-50 animate-in fade-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-xl">
            <CheckCircle size={20} className="text-blue-400" />
            <p className="text-sm font-semibold">{notification}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading && <div className="border-b border-slate-100 px-6 py-4 text-sm font-medium text-slate-500">Loading faculty...</div>}

        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full rounded-xl border-transparent bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              placeholder="Search faculty..."
            />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
            {teachers.length} faculty records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border-b border-slate-100 px-6 py-4 tracking-wider">
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
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
                  <tr key={row.id} className="group border-b border-slate-50 transition-colors hover:bg-slate-50/80 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={getColumns(() => undefined, () => undefined).length} className="px-6 py-12 text-center font-medium text-slate-500">
                    No faculty found based on query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Faculty Member">
        <form onSubmit={handleAddTeacher} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <input name="name" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Dr. Jane Smith" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Official Email</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="teacher@school.edu" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Level</label>
            <select name="category" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
              <option value="">Select level</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Primary Subject</label>
            <input name="subject" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Mathematics" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">All Subjects</label>
            <input name="subjects" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Mathematics, Science" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Qualification</label>
              <input name="qualification" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="B.Ed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Experience</label>
              <input name="experience" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="5 Years" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Contact</label>
            <input name="contact" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="+91 9000000000" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
            <button type="submit" className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700">Add Faculty</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(manageTeacher)}
        onClose={closeManagementModal}
        title={manageTeacher ? `Manage ${manageTeacher.name}` : 'Manage Faculty'}
      >
        {managementLoading && !managementDetails ? (
          <div className="py-10 text-center text-sm font-medium text-slate-500">Loading faculty details...</div>
        ) : managementDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Teacher</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{staffingSummary?.classTeacher}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Subject Teacher</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{staffingSummary?.subjectTeacher}</p>
              </div>
            </div>

            <form onSubmit={handleSaveTeacherProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input value={teacherForm.name} onChange={(event) => setTeacherForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Official Email</label>
                  <input value={teacherForm.email} onChange={(event) => setTeacherForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Level</label>
                  <select value={teacherForm.category} onChange={(event) => setTeacherForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Primary Subject</label>
                  <input value={teacherForm.subject} onChange={(event) => setTeacherForm((current) => ({ ...current, subject: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">All Subjects</label>
                <input value={teacherForm.subjectsText} onChange={(event) => setTeacherForm((current) => ({ ...current, subjectsText: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Mathematics, Science" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Qualification</label>
                  <input value={teacherForm.qualification} onChange={(event) => setTeacherForm((current) => ({ ...current, qualification: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Experience</label>
                  <input value={teacherForm.experience} onChange={(event) => setTeacherForm((current) => ({ ...current, experience: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Contact</label>
                  <input value={teacherForm.contact} onChange={(event) => setTeacherForm((current) => ({ ...current, contact: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Class Teacher Assignment</label>
                <select
                  value={teacherForm.classTeacherSectionId}
                  onChange={(event) => {
                    const nextSectionId = event.target.value;
                    const nextSubjects = nextSectionId ? (managementDetails.classTeacherSubjectOptionsBySection[nextSectionId] || []) : [];
                    setTeacherForm((current) => ({
                      ...current,
                      classTeacherSectionId: nextSectionId,
                      classTeacherSubject: nextSectionId
                        ? (nextSubjects.includes(current.classTeacherSubject) ? current.classTeacherSubject : (nextSubjects[0] || ''))
                        : current.classTeacherSubject,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">No class teacher assignment</option>
                  {managementDetails.classTeacherOptions.map((option) => (
                    <option key={option.sectionId} value={option.sectionId}>{option.className}</option>
                  ))}
                </select>
              </div>

              {teacherForm.classTeacherSectionId && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Class Teacher Subject</label>
                  <select
                    value={teacherForm.classTeacherSubject}
                    onChange={(event) => setTeacherForm((current) => ({ ...current, classTeacherSubject: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {(managementDetails.classTeacherSubjectOptionsBySection[teacherForm.classTeacherSectionId] || []).map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <p className="text-xs font-medium text-slate-500">
                    This shows the free home-class subject slot for the selected class teacher appointment.
                  </p>
                </div>
              )}

              {managementError && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {managementError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeManagementModal} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Close</button>
                <button type="submit" disabled={managementLoading} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                  {managementLoading ? 'Saving...' : 'Save Faculty'}
                </button>
              </div>
            </form>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Subject Teacher Assignments</h4>
                <p className="text-xs text-slate-500">View, add, or remove subject-teacher appointments for this faculty member.</p>
              </div>

              <div className="space-y-3">
                {managementDetails.currentSubjectAssignments.map((assignment) => (
                  <div key={`${assignment.sectionId}:${assignment.subject}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{assignment.className}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{assignment.subject}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveSubjectAssignment(assignment)}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                ))}
                {!managementDetails.currentSubjectAssignments.length && (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm font-medium text-slate-400">
                    No subject-teacher assignments yet.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Filter By Class</label>
                    <select
                      value={assignmentClassFilter}
                      onChange={(event) => setAssignmentClassFilter(event.target.value)}
                      disabled={managementLoading || managementDetails.availableSubjectAssignments.length === 0}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                    >
                      <option value="All">All Classes</option>
                      {assignmentClassOptions.map((className) => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Filter By Subject</label>
                    <select
                      value={assignmentSubjectFilter}
                      onChange={(event) => setAssignmentSubjectFilter(event.target.value)}
                      disabled={managementLoading || managementDetails.availableSubjectAssignments.length === 0}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                    >
                      <option value="All">All Subjects</option>
                      {assignmentSubjectOptions.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={selectedSubjectAssignment}
                    onChange={(event) => setSelectedSubjectAssignment(event.target.value)}
                    disabled={managementLoading || filteredSubjectAssignments.length === 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  >
                    {managementDetails.availableSubjectAssignments.length === 0 && <option value="">No empty subject slots available</option>}
                    {managementDetails.availableSubjectAssignments.length > 0 && filteredSubjectAssignments.length === 0 && <option value="">No slots match these filters</option>}
                    {filteredSubjectAssignments.map((option) => (
                      <option key={option.label} value={option.label}>{option.className} - {option.subject}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleAddSubjectAssignment()}
                    disabled={managementLoading || filteredSubjectAssignments.length === 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Add Subject Slot
                  </button>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Showing {filteredSubjectAssignments.length} of {managementDetails.availableSubjectAssignments.length} free slots.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm font-medium text-slate-500">Unable to load faculty details.</div>
        )}
      </Modal>

      {deleteCandidate && (
        <TeacherDeleteConfirm
          teacher={deleteCandidate}
          isDeleting={isDeletingTeacher}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void handleDeleteTeacher()}
        />
      )}
    </div>
  );
};

export default TeacherList;

function TeacherDeleteConfirm({
  teacher,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  teacher: ITeacher;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [isFinalStep, setIsFinalStep] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-sky-100/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-8 py-7 text-center shadow-2xl">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle size={22} />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900">
          {isFinalStep ? 'Final confirmation' : 'Are you sure?'}
        </h3>
        <p className="mx-auto mt-3 max-w-xs text-sm font-medium leading-6 text-slate-500">
          {isFinalStep
            ? `Deleting ${teacher.name} will remove this faculty record and its linked staffing references.`
            : 'This action cannot be undone. All values associated with this teacher will be lost.'}
        </p>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => (isFinalStep ? onConfirm() : setIsFinalStep(true))}
            className="w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {isDeleting ? 'Deleting...' : isFinalStep ? 'Yes, delete teacher' : 'Delete teacher'}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
