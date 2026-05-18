import { BookOpen, ClipboardList, IndianRupee, MessageSquare } from 'lucide-react';
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
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-[1.75rem] bg-slate-950 px-5 py-6 text-white shadow-xl shadow-slate-200 lg:hidden">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-200">Academic Hub</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Everything for class {user?.class || '-'}</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
          Assignments, notes, fees, and support in one mobile workspace.
        </p>
      </section>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Hub</h1>
        <p className="text-slate-500 mt-1">Assignments, study materials, fees, and complaints.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.path)}
            className="group flex items-center gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98] lg:p-6 lg:hover:-translate-y-1 lg:hover:shadow-lg"
          >
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${action.accent} text-white shadow-lg`}>
              <action.icon size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-slate-900 lg:text-lg">{action.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentAcademics;
