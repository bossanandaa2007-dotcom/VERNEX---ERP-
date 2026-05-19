import { Link, NavLink, useLocation } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, FileText, GraduationCap, Home, UserRound, UsersRound } from 'lucide-react';
import { cn } from './Sidebar';

const teacherTabs = [
  { name: 'Home', icon: Home, path: '/teacher/dashboard' },
  { name: 'Classes', icon: UsersRound, path: '/teacher/classes' },
  { name: 'Attendance', icon: GraduationCap, path: '/teacher/attendance' },
  { name: 'Academics', icon: BookOpen, path: '/teacher/academics' },
  { name: 'Profile', icon: UserRound, path: '/teacher/profile' },
];

const studentTabs = [
  { name: 'Home', icon: Home, path: '/student/dashboard' },
  { name: 'Academics', icon: BookOpen, path: '/student/academics' },
  { name: 'Timetable', icon: CalendarDays, path: '/student/timetable' },
  { name: 'Stats', icon: BarChart3, path: '/student/performance' },
  { name: 'Profile', icon: UserRound, path: '/student/profile' },
];

const governingTabs = [
  { name: 'Dashboard', icon: Home, path: '/governing/dashboard?view=dashboard' },
  { name: 'Analytics', icon: BarChart3, path: '/governing/dashboard?view=analytics' },
  { name: 'Students', icon: GraduationCap, path: '/governing/dashboard?view=students' },
  { name: 'Calendar', icon: CalendarDays, path: '/governing/calendar' },
  { name: 'Reports', icon: FileText, path: '/governing/reports' },
];

const librarianTabs = [
  { name: 'Dashboard', icon: Home, path: '/librarian/dashboard' },
  { name: 'Books', icon: BookOpen, path: '/librarian/books' },
  { name: 'Issued', icon: BarChart3, path: '/librarian/issued' },
  { name: 'Reminders', icon: FileText, path: '/librarian/reminders' },
];

export const MobileBottomNav = ({ role }: { role?: string }) => {
  const location = useLocation();
  const tabs = role === 'Teacher' ? teacherTabs : role === 'Student' ? studentTabs : role === 'Governing Body' ? governingTabs : role === 'Librarian' ? librarianTabs : [];

  if (!tabs.length) {
    return null;
  }

  if (role === 'Governing Body') {
    const current = `${location.pathname}${location.search}`;

    return (
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2.5 shadow-[0_-16px_36px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {tabs.map((item) => {
            const isActive =
              item.path === '/governing/calendar'
                ? location.pathname === '/governing/calendar'
                : item.path === '/governing/reports'
                  ? location.pathname === '/governing/reports'
                  : current === item.path || (item.path.includes('dashboard') && current === '/governing/dashboard' && item.name === 'Dashboard');

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'group flex min-h-[60px] flex-col items-center justify-center rounded-[1.15rem] px-0.5 text-[10px] font-black text-slate-400 transition-all duration-200 active:scale-95 min-[360px]:px-1 min-[380px]:text-[11px]',
                  isActive && 'bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100'
                )}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.7 : 2.2}
                  className={cn('mb-1 transition-transform duration-200', isActive && '-translate-y-0.5')}
                />
                <span className="leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/94 px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2.5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group flex min-h-[60px] flex-col items-center justify-center rounded-[1.15rem] px-0.5 text-[10px] font-black text-slate-400 transition-all duration-200 active:scale-95 min-[360px]:px-1 min-[380px]:text-[11px]',
                isActive && 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.7 : 2.2}
                  className={cn('mb-1 transition-transform duration-200', isActive && '-translate-y-0.5')}
                />
                <span className="leading-none">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
