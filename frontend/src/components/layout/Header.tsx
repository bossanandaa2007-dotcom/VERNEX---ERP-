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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
    if (location.pathname.includes('/leave-requests')) return 'Leave Request';
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
    } catch (error: unknown) {
      setPasswordMessage({ type: 'error', text: getErrorMessage(error, 'Unable to change password.') });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm transition-all duration-200 max-lg:h-14 max-lg:px-3 max-lg:shadow-none sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="-ml-1 shrink-0 rounded p-2 text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <div className="min-w-0 lg:hidden">
            <p className="text-xs font-medium text-slate-500">{user?.role || 'ERP'}</p>
            <h1 className="truncate text-lg font-semibold leading-none text-slate-950">{mobileTitle}</h1>
          </div>
          
          <div className="relative hidden w-80 items-center sm:flex">
            <Search size={17} strokeWidth={1.8} className="absolute left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students, classes, subjects..." 
              className="h-10 w-full rounded border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-6">
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 active:scale-95 active:bg-slate-200"
            aria-label="Open notifications"
          >
            <Bell size={19} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>
          
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex shrink-0 items-center gap-3 border-l border-slate-200 py-1 pl-4 transition-colors cursor-pointer group hover:bg-slate-50 rounded-lg max-lg:border-l-0 max-lg:pl-0 sm:pl-6"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-900 transition-colors group-hover:text-[#3f5f9f]">{user?.name}</span>
              <span className="text-xs font-medium text-slate-500">{user?.role}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#4653a6] font-semibold text-white shadow-sm transition-colors max-lg:h-9 max-lg:w-9">
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
            className="absolute inset-0 bg-slate-950/35"
          />
          <section className="absolute inset-x-3 top-16 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="erp-section-label">Notifications</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{unreadCount ? `${unreadCount} unread` : 'Latest updates'}</h2>
            </div>
            <div className="space-y-2 p-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold leading-5 text-slate-800">{notification.title}</p>
                  <p className="mt-1 text-sm font-normal leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.created_at))}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="rounded bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-400">
                  No notifications yet.
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="w-full rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
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
          <section className="absolute right-6 top-20 w-96 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="erp-section-label">Notifications</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{unreadCount ? `${unreadCount} unread` : 'Latest updates'}</h2>
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto p-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold leading-5 text-slate-800">{notification.title}</p>
                  <p className="mt-1 text-sm font-normal leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(notification.created_at))}
                  </p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="rounded bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-400">
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
             <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#4653a6] text-2xl font-semibold text-white shadow-sm">
                {user?.name?.charAt(0)}
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                <p className="mt-1 text-sm font-normal text-slate-500">{user?.role}</p>
             </div>
             <div className="flex gap-2">
                <span className="flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                   <CheckCircle size={10} /> Account Verified
                </span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 rounded border border-slate-100 bg-slate-50 p-4">
                <div className="rounded bg-white p-2.5 text-[#3f5f9f] shadow-sm"><User size={19} strokeWidth={1.8} /></div>
                <div>
                  <p className="erp-section-label mb-1 leading-none">User ID</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.id}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 rounded border border-slate-100 bg-slate-50 p-4">
                <div className="rounded bg-white p-2.5 text-emerald-600 shadow-sm"><Mail size={19} strokeWidth={1.8} /></div>
                <div>
                  <p className="erp-section-label mb-1 leading-none">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 rounded border border-slate-100 bg-slate-50 p-4">
                <div className="rounded bg-white p-2.5 text-[#4653a6] shadow-sm"><Shield size={19} strokeWidth={1.8} /></div>
                <div>
                  <p className="erp-section-label mb-1 leading-none">Access Role</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.role}</p>
                </div>
             </div>
             {user?.role === 'Teacher' && (
                <div className="flex items-center gap-4 rounded border border-slate-100 bg-slate-50 p-4">
                   <div className="rounded bg-white p-2.5 text-amber-600 shadow-sm"><Shield size={19} strokeWidth={1.8} /></div>
                   <div>
                     <p className="erp-section-label mb-1 leading-none">Assigned Subject</p>
                     <p className="text-sm font-semibold text-slate-700">{teacherSubjects}</p>
                   </div>
                </div>
             )}
          </div>

          <div className="rounded border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded bg-white p-2.5 text-[#3f5f9f] shadow-sm">
                  <KeyRound size={19} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Password</p>
                  <p className="text-xs font-medium text-slate-500">Create a private password for future logins.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((current) => !current);
                  setPasswordMessage(null);
                }}
                className="erp-primary-button px-4 py-2.5 text-sm transition-colors"
              >
                {showPasswordForm ? 'Close' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 border-t border-blue-100 pt-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
                    { key: 'newPassword', label: 'New Password', autoComplete: 'new-password' },
                    { key: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="erp-section-label">{field.label}</label>
                      <div className="relative">
                        <input
                          type={showPasswordText ? 'text' : 'password'}
                          autoComplete={field.autoComplete}
                          value={passwordForm[field.key as keyof typeof passwordForm]}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, [field.key]: event.target.value }))}
                          required
                          minLength={field.key === 'currentPassword' ? undefined : 8}
                          className="erp-input w-full bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  <div className={`rounded px-4 py-3 text-sm font-semibold ${
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
                  className="w-full rounded bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

           <div className="pt-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded border border-rose-100 bg-rose-50 px-4 py-3 font-semibold text-rose-600 transition-colors hover:bg-rose-100"
              >
                 <LogOut size={18} /> Sign Out Profile
              </button>
           </div>
        </div>
      </Modal>
    </>
  );
};
