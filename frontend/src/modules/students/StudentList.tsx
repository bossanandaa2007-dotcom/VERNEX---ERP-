import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Baby,
  BookOpen,
  Building2,
  ChevronRight,
  GraduationCap,
  MapPin,
  Phone,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { useClassStore } from '../../store/useClassStore';
import type { IClassCategory, ISection, IStudent } from '../../store/useClassStore';

type DirectoryView = 'categories' | 'sections' | 'students';

const iconMap = {
  Baby,
  BookOpen,
  GraduationCap,
  Building2,
} as const;

const categoryMeta: Record<string, { subtitle: string; standards: string }> = {
  kindergarten: { subtitle: 'LKG / UKG', standards: 'LKG-UKG' },
  primary: { subtitle: 'Standards 1 to 5', standards: '1-5' },
  secondary: { subtitle: 'Standards 6 to 10', standards: '6-10' },
  'higher-secondary': { subtitle: 'Standards 11 to 12', standards: '11-12' },
};

const StudentList = () => {
  const { categories, sections, students, inCharges } = useClassStore();
  const [view, setView] = useState<DirectoryView>('categories');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? null;
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? null;

  const visibleSections = useMemo(
    () => sections.filter((section) => section.categoryId === activeCategoryId),
    [sections, activeCategoryId]
  );

  const visibleStudents = useMemo(
    () => students.filter((student) => student.sectionId === activeSectionId),
    [students, activeSectionId]
  );

  const openCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    setActiveSectionId(null);
    setView('sections');
  };

  const openSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setView('students');
  };

  const goBack = () => {
    if (view === 'students') {
      setActiveSectionId(null);
      setView('sections');
      return;
    }

    setActiveCategoryId(null);
    setView('categories');
  };

  const renderCategoryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {categories.map((category: IClassCategory) => {
        const Icon = iconMap[category.icon as keyof typeof iconMap] ?? BookOpen;
        const categorySections = sections.filter((section) => section.categoryId === category.id);
        const categoryStudents = students.filter((student) => student.categoryId === category.id);

        return (
          <button
            key={category.id}
            onClick={() => openCategory(category.id)}
            className="text-left bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Icon size={26} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              {categoryMeta[category.id]?.standards || category.name}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{category.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{categoryMeta[category.id]?.subtitle || category.description}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sections</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{categorySections.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Students</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{categoryStudents.length}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-500">Open Sections</span>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderSectionCards = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleSections.map((section: ISection) => {
          const studentCount = students.filter((student) => student.sectionId === section.id).length;

          return (
            <button
              key={section.id}
              onClick={() => openSection(section.id)}
              className="text-left bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {section.name}
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="mt-6 text-2xl font-black text-slate-900">Section {section.name}</h2>
              <p className="mt-2 text-sm text-slate-500">Click to view enrolled students.</p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield size={14} className="text-emerald-500" />
                  <span className="font-semibold">{section.classTeacher}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{section.roomNumber || 'Room TBD'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={14} className="text-slate-400" />
                  <span>{studentCount} students</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!!activeCategory && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Section Leads</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(inCharges[activeCategory.id] || []).map((lead, index) => (
              <div key={`${lead.name}-${index}`} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-600">{lead.role}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{lead.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{lead.experience || lead.exp}</p>
                <p className="mt-1 text-sm text-slate-500">{lead.contact}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStudentCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {visibleStudents.map((student: IStudent) => (
        <div key={student.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-lg">
              {student.rollNo}
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
              {student.gender}
            </span>
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-900">{student.name}</h2>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <User size={14} className="text-indigo-500" />
              <span>Parent: {student.parentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-indigo-500" />
              <span>{student.contact}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-indigo-500" />
              <span>{student.address}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-slate-500 mt-1">
            Browse students by academic stage, then drill into sections and enrolled learners.
          </p>
        </div>

        {view !== 'categories' && (
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            {view === 'students' ? 'Back To Sections' : 'Back To Categories'}
          </button>
        )}
      </div>

      {view === 'categories' && renderCategoryCards()}

      {view === 'sections' && activeCategory && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              {categoryMeta[activeCategory.id]?.standards || activeCategory.name}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">{activeCategory.name}</h2>
            <p className="mt-2 text-slate-500">{activeCategory.description}</p>
          </div>
          {renderSectionCards()}
        </div>
      )}

      {view === 'students' && activeCategory && activeSection && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
              {activeCategory.name}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Section {activeSection.name}</h2>
            <p className="mt-2 text-slate-500">
              {activeSection.classTeacher} • {visibleStudents.length} students • {activeSection.roomNumber || 'Room TBD'}
            </p>
          </div>
          {renderStudentCards()}
        </div>
      )}
    </div>
  );
};

export default StudentList;
