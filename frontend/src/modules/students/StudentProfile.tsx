import { Bell, CreditCard, LogOut, Mail, Settings, ShieldCheck, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const StudentProfile = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    void logout().finally(() => navigate('/login'));
  };

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-1.5rem)] space-y-5 px-0.5 lg:max-w-none lg:space-y-6 lg:px-0">
      <section className="overflow-hidden rounded-[1.75rem] bg-white p-5 text-center shadow-sm ring-1 ring-slate-100 lg:rounded-2xl lg:p-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-indigo-600 text-4xl font-black text-white shadow-xl shadow-indigo-100">
          {user?.name?.charAt(0) || 'S'}
        </div>
        <h1 className="mt-4 break-words text-2xl font-black text-slate-900">{user?.name || 'Student'}</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Class {user?.class || '-'}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-700">
          <ShieldCheck size={15} /> Active Student
        </div>
      </section>

      <section className="space-y-3">
        {[
          { label: 'Email', value: user?.email || '-', icon: Mail },
          { label: 'Class / Section', value: `${user?.class || '-'} ${user?.section || ''}`.trim(), icon: UserRound },
          { label: 'Fee Status', value: 'Open fee dashboard', icon: CreditCard, onClick: () => navigate('/student/fees') },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex w-full min-w-0 items-center gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-4 text-left shadow-sm lg:gap-4 lg:rounded-3xl"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-indigo-600">
              <item.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm lg:rounded-3xl">
        {[
          { label: 'Notifications', icon: Bell, onClick: () => setShowNotifications(true) },
          { label: 'Settings', icon: Settings, onClick: () => navigate('/student/calendar') },
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

      {showNotifications && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" aria-label="Close notifications" onClick={() => setShowNotifications(false)} />
          <section className="absolute inset-x-3 top-16 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Notifications</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Student Updates</h2>
              </div>
              <button onClick={() => setShowNotifications(false)} className="rounded-2xl bg-slate-100 p-2 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 p-3">
              {['Fee receipts and dues appear in your fee dashboard.', 'Academic updates are available from the Academics tab.', 'Timetable changes will reflect in your class schedule.'].map((message) => (
                <div key={message} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold leading-5 text-slate-800">{message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">Now</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
