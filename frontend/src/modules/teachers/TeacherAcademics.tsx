import { Award, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const academicActions = [
  {
    title: 'Assignments',
    description: 'Create work, review submissions, and share Drive links.',
    icon: ClipboardList,
    path: '/teacher/assignments',
    accent: 'bg-indigo-600',
  },
  {
    title: 'Marks',
    description: 'Enter exam marks and review class performance.',
    icon: Award,
    path: '/teacher/marks-entry',
    accent: 'bg-emerald-600',
  },
  {
    title: 'Study Materials',
    description: 'Publish subject folders and classroom resources.',
    icon: BookOpen,
    path: '/teacher/materials',
    accent: 'bg-amber-500',
  },
  {
    title: 'Timetable',
    description: 'Check your class schedule before the next period.',
    icon: FileText,
    path: '/teacher/timetable',
    accent: 'bg-slate-900',
  },
];

const TeacherAcademics = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const subjects = user?.subjects?.length ? user.subjects : user?.subject ? [user.subject] : [];

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <p className="erp-kicker">Academic Workspace</p>
        <h1 className="erp-title">Teaching Operations</h1>
        <p className="erp-subtitle">
          {subjects.length ? subjects.join(', ') : 'Assignments, marks, study materials, and timetable tools.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {academicActions.map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.path)}
            className="erp-card group flex items-center gap-4 p-4 text-left transition-shadow hover:shadow-md lg:p-5"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded ${action.accent} text-white`}>
              <action.icon size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900">{action.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TeacherAcademics;
