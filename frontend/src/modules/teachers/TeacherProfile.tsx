import { Bell, KeyRound, LogOut, Mail, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const TeacherProfile = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const subjects = user?.subjects?.length ? user.subjects.join(', ') : user?.subject || 'General';

  const handleLogout = () => {
    void logout().finally(() => navigate('/login'));
  };

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-1.5rem)] space-y-5 px-0.5 lg:max-w-none lg:space-y-6 lg:px-0">
      <section className="overflow-hidden rounded-[1.75rem] bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 lg:rounded-2xl lg:p-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-indigo-600 text-4xl font-black text-white shadow-xl shadow-indigo-100">
          {user?.name?.charAt(0) || 'T'}
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900">{user?.name || 'Teacher'}</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{user?.role}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">
          <ShieldCheck size={15} /> Verified Account
        </div>
      </section>

      <section className="space-y-3">
        {[
          { label: 'Email', value: user?.email || '-', icon: Mail },
          { label: 'Owned Class', value: user?.class || 'Not assigned', icon: UserRound },
          { label: 'Subjects', value: subjects, icon: ShieldCheck },
        ].map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm lg:gap-4 lg:rounded-3xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600">
              <item.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm lg:rounded-3xl">
        {[
          { label: 'Notifications', icon: Bell, onClick: () => undefined },
          { label: 'Preferences', icon: Settings, onClick: () => navigate('/teacher/calendar') },
          { label: 'Password & Security', icon: KeyRound, onClick: () => navigate('/teacher/dashboard') },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors active:bg-slate-50"
          >
            <item.icon size={20} className="text-slate-400" />
            {item.label}
          </button>
        ))}
      </section>

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-600 transition-all active:scale-[0.98] lg:max-w-sm"
      >
        <LogOut size={19} /> Sign Out
      </button>
    </div>
  );
};

export default TeacherProfile;
