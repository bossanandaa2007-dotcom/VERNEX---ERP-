import { BookOpen, CalendarCheck, ClipboardList, IndianRupee, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const actions = [
  {
    title: 'Assignments',
    description: 'View homework, deadlines, and submission links.',
    icon: ClipboardList,
    path: '/student/assignments',
    accent: 'bg-indigo-600',
  },
  {
    title: 'Study Materials',
    description: 'Open class notes and subject folders.',
    icon: BookOpen,
    path: '/student/materials',
    accent: 'bg-emerald-600',
  },
  {
    title: 'Leave Request',
    description: 'Ask your assigned class teacher for leave.',
    icon: CalendarCheck,
    path: '/student/leave-requests',
    accent: 'bg-sky-600',
  },
  {
    title: 'Complaints',
    description: 'Raise concerns and track responses.',
    icon: MessageSquare,
    path: '/student/complaints',
    accent: 'bg-slate-900',
  },
  {
    title: 'Fees',
    description: 'Review fee status and payment updates.',
    icon: IndianRupee,
    path: '/student/fees',
    accent: 'bg-amber-500',
  },
];

const StudentAcademics = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="erp-page">
      <div className="erp-page-header">
        <p className="erp-kicker">Academic Hub</p>
        <h1 className="erp-title">Class {user?.class || '-'} Workspace</h1>
        <p className="erp-subtitle">Assignments, study materials, leave requests, fees, and complaints.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map((action) => (
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

export default StudentAcademics;
