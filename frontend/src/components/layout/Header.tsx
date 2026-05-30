import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Bell, Search, Menu, User, Mail, Shield, LogOut, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import Modal from '../common/Modal';
import { changeCurrentUserPassword } from '../../services/auth';
import { supabase } from '../../lib/supabase';

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const Header = ({ 
  collapsed, 
  setCollapsed 
}: { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void 
}) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const teacherSubjects = user?.subjects?.length ? user.subjects.join(', ') : user?.subject;
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const mobileTitle = (() => {
    if (user?.role === 'Governing Body') {
      const params = new URLSearchParams(location.search);
      const view = params.get('view');
      if (location.pathname.includes('/calendar')) return 'Calendar';
      if (location.pathname.includes('/reports')) return 'Reports';
      if (location.pathname.includes('/complaints')) return 'Complaints';
      if (view === 'analytics') return 'Analytics';
      if (view === 'students') return 'Students';
      return 'Dashboard';
    }
    if (location.pathname.includes('/classes')) return 'Classes';
    if (location.pathname.includes('/attendance')) return 'Attendance';
    if (location.pathname.includes('/academics')) return 'Academics';
    if (location.pathname.includes('/timetable')) return 'Timetable';
    if (location.pathname.includes('/performance') || location.pathname.includes('/marks')) return 'Performance';
    if (location.pathname.includes('/profile')) return 'Profile';
    return user?.role === 'Teacher' || user?.role === 'Student' ? 'Home' : 'Dashboard';
  })();

  const resetPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordMessage(null);
    setIsChangingPassword(false);
    setShowPasswordText(false);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    resetPasswordForm();
  };

  useEffect(() => {
    if (!supabase || !user?.id) {
      setNotifications([]);
      return undefined;
    }

    const client = supabase;
    const loadNotifications = async () => {
      const { data, error } = await client
        .from('notifications')
        .select('id, title, message, is_read, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error) {
        setNotifications((data || []) as HeaderNotification[]);
      }
    };

    void loadNotifications();

    const channel = client
      .channel(`header-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        () => void loadNotifications()
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user?.id || !isNotificationsOpen || unreadCount === 0) {
      return;
    }

    void supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
  }, [isNotificationsOpen, unreadCount, user?.id]);

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.email) {
      setPasswordMessage({ type: 'error', text: 'Email address is missing for this account.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordMessage(null);
      await changeCurrentUserPassword(user.email, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordMessage({ type: 'success', text: 'Password updated. Use the new password for future logins.' });
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error?.message || 'Unable to change password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm transition-all duration-300 max-lg:h-14 max-lg:border-transparent max-lg:bg-[#f7f8fb]/92 max-lg:px-3 max-lg:shadow-none max-lg:backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden -ml-1 shrink-0 rounded-2xl p-2 text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{user?.role || 'ERP'}</p>
            <h1 className="truncate text-lg font-black leading-none text-slate-950">{mobileTitle}</h1>
          </div>
          
          <div className="hidden sm:flex items-center w-80 relative">
            <Search size={18} className="absolute left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="h-10 w-full bg-slate-100 border-transparent rounded-xl pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-6">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 active:scale-95 active:bg-slate-200"
            aria-label="Open notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>
          
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex shrink-0 items-center gap-3 border-l border-slate-200 py-1 pl-4 transition-colors cursor-pointer group hover:bg-slate-50 rounded-lg max-lg:border-l-0 max-lg:pl-0 sm:pl-6"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{user?.name}</span>
              <span className="text-xs font-medium text-slate-500">{user?.role}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md transition-transform group-hover:scale-105 max-lg:h-9 max-lg:w-9">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setIsNotificationsOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
          />
          <section className="absolute inset-x-3 top-16 overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-2xl shadow-slate-900/20 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Notifications</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{unreadCount ? `${unreadCount} unread` : 'Latest updates'}</h2>
            </div>
            <div className="space-y-2 p-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold leading-5 text-slate-800">{notification.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.created_at))}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                  No notifications yet.
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[90] hidden lg:block">
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setIsNotificationsOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <section className="absolute right-6 top-20 w-96 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Notifications</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{unreadCount ? `${unreadCount} unread` : 'Latest updates'}</h2>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto p-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-bold leading-5 text-slate-800">{notification.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.created_at))}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                  No notifications yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={isProfileOpen} onClose={closeProfile} title="My Profile">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-4">
             <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-2xl shadow-indigo-200 border-4 border-white">
                {user?.name?.charAt(0)}
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">{user?.role}</p>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                   <CheckCircle size={10} /> Account Verified
                </span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm"><User size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">User ID</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.id}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm"><Mail size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-violet-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Access Role</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.role}</p>
                </div>
             </div>
             {user?.role === 'Teacher' && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                   <div className="p-2.5 bg-white text-amber-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Assigned Subject</p>
                     <p className="text-sm font-semibold text-slate-700">{teacherSubjects}</p>
                   </div>
                </div>
             )}
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-2.5 text-indigo-600 shadow-sm">
                  <KeyRound size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Password</p>
                  <p className="text-xs font-medium text-slate-500">Create a private password for future logins.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((current) => !current);
                  setPasswordMessage(null);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {showPasswordForm ? 'Close' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 border-t border-indigo-100 pt-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
                    { key: 'newPassword', label: 'New Password', autoComplete: 'new-password' },
                    { key: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{field.label}</label>
                      <div className="relative">
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          autoComplete={field.autoComplete}
                          value={passwordForm[field.key as keyof typeof passwordForm]}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, [field.key]: event.target.value }))}
                          required
                          minLength={field.key === 'currentPassword' ? undefined : 8}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={showPasswordText ? 'Hide passwords' : 'Show passwords'}
                        >
                          {showPasswordText ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {passwordMessage && (
                  <div className={`rounded-xl px-4 py-3 text-sm font-bold ${
                    passwordMessage.type === 'success'
                      ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                      : 'border border-rose-100 bg-rose-50 text-rose-700'
                  }`}>
                    {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

           <div className="pt-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100 transition-colors"
              >
                 <LogOut size={18} /> Sign Out Profile
              </button>
           </div>
        </div>
      </Modal>
    </>
  );
};
