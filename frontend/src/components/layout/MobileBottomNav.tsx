import { NavLink } from 'react-router-dom';
import { BarChart3, BookOpen, CalendarDays, GraduationCap, Home, UserRound, UsersRound } from 'lucide-react';
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

export const MobileBottomNav = ({ role }: { role?: string }) => {
  const tabs = role === 'Teacher' ? teacherTabs : role === 'Student' ? studentTabs : [];

  if (!tabs.length) {
    return null;
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
