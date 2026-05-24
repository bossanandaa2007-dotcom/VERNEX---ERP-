import { Link, NavLink, useLocation } from 'react-router-dom';
import { Award, BarChart3, BookOpen, CalendarDays, FileText, GraduationCap, Home, UserRound, UsersRound } from 'lucide-react';
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
  { name: 'Marks', icon: Award, path: '/governing/dashboard?view=marks' },
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
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2.5 shadow-sm lg:hidden">
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
                  'group flex min-h-[60px] flex-col items-center justify-center rounded px-0.5 text-[10px] font-semibold text-slate-500 transition-colors min-[360px]:px-1 min-[380px]:text-[11px]',
                  isActive && 'bg-teal-50 text-teal-800 ring-1 ring-teal-100'
                )}
              >
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.7 : 2.2}
                  className="mb-1"
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
    <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2.5 shadow-sm lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group flex min-h-[60px] flex-col items-center justify-center rounded px-0.5 text-[10px] font-semibold text-slate-500 transition-colors min-[360px]:px-1 min-[380px]:text-[11px]',
                isActive && 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.7 : 2.2}
                  className="mb-1"
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
