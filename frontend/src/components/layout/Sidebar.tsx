import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard, Users, Shield, CheckCircle, Award,
  Library, IndianRupee, Calendar, FileText, Settings,
  BookOpen, BarChart3, LogOut, ChevronLeft, ChevronRight,
  Building2, CalendarDays
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getNavItems = (role: string) => {
  const items: { name: string; icon: any; path: string }[] = [];

  // always add a single dashboard entry for allowed roles
  if (role !== 'Accountant') {
    items.push({ name: 'Dashboard', icon: LayoutDashboard, path: `/${role === 'Governing Body' ? 'governing' : role.toLowerCase()}/dashboard` });
  }

  if (role === 'Admin') {
    items.push(
      { name: 'Classes Mgmt', icon: Building2, path: '/admin/classes' },
      { name: 'Faculty', icon: Shield, path: '/admin/teachers' },
      { name: 'Timetable', icon: CalendarDays, path: '/admin/timetable' },
      { name: 'Marks Hub', icon: Award, path: '/admin/marks' },
      { name: 'Library', icon: Library, path: '/admin/library' },
      { name: 'Fees & Finance', icon: IndianRupee, path: '/admin/fees' },
      { name: 'Calendar Mgmt', icon: Calendar, path: '/admin/calendar' },
      { name: 'Reports', icon: FileText, path: '/admin/reports' },
      { name: 'Settings', icon: Settings, path: '/admin/settings' }
    );
  }

  if (role === 'Teacher') {
    items.push(
      { name: 'My Classes', icon: Users, path: '/teacher/classes' },
      { name: 'Timetable', icon: CalendarDays, path: '/teacher/timetable' },
      { name: 'Manual Attendance', icon: CheckCircle, path: '/teacher/attendance' },
      { name: 'AI Attendance', icon: Shield, path: '/teacher/ai-attendance' },
      { name: 'Marks Hub', icon: Award, path: '/teacher/marks-entry' },
      { name: 'Complaints', icon: FileText, path: '/teacher/complaints' },
      { name: 'Calendar', icon: Calendar, path: '/teacher/calendar' },
      { name: 'Study Materials', icon: BookOpen, path: '/teacher/materials' },
      { name: 'Assignments', icon: FileText, path: '/teacher/assignments' }
    );
  }

  if (role === 'Student') {
    items.push(
      { name: 'My Attendance', icon: CheckCircle, path: '/student/attendance' },
      { name: 'Timetable', icon: CalendarDays, path: '/student/timetable' },
      { name: 'My Marks', icon: Award, path: '/student/marks' },
      { name: 'Complaints', icon: FileText, path: '/student/complaints' },
      { name: 'Study Materials', icon: BookOpen, path: '/student/materials' },
      { name: 'Calendar', icon: Calendar, path: '/student/calendar' },
      { name: 'Assignments', icon: FileText, path: '/student/assignments' },
      { name: 'Fees', icon: IndianRupee, path: '/student/fees' }
    );
  }

  if (role === 'Accountant') {
    items.push(
      { name: 'Fees & Finance', icon: IndianRupee, path: '/accountant/fees' }
    );
  }

  if (role === 'Librarian') {
    items.push(
      { name: 'Books', icon: BookOpen, path: '/librarian/books' },
      { name: 'Issued', icon: BookOpen, path: '/librarian/issued' },
      { name: 'Reminders', icon: FileText, path: '/librarian/reminders' }
    );
  }

  if (role === 'Governing Body') {
    items.push(
      { name: 'Analytics', icon: BarChart3, path: '/governing/dashboard?view=analytics' },
      { name: 'Students', icon: Users, path: '/governing/dashboard?view=students' },
      { name: 'Complaints', icon: FileText, path: '/governing/complaints' },
      { name: 'Calendar', icon: Calendar, path: '/governing/calendar' },
      { name: 'Reports', icon: FileText, path: '/governing/reports' }
    );
  }

  return items;
};

const teacherMobilePrimaryPaths = new Set([
  '/teacher/dashboard',
  '/teacher/classes',
  '/teacher/attendance',
  '/teacher/marks-entry',
  '/teacher/materials',
  '/teacher/assignments',
]);

const studentMobilePrimaryPaths = new Set([
  '/student/dashboard',
  '/student/attendance',
  '/student/marks',
  '/student/performance',
  '/student/materials',
  '/student/assignments',
  '/student/timetable',
  '/student/academics',
  '/student/profile',
]);

const governingMobilePrimaryPaths = new Set([
  '/governing/dashboard',
  '/governing/dashboard?view=analytics',
  '/governing/dashboard?view=students',
  '/governing/calendar',
  '/governing/reports',
]);

export const Sidebar = ({
  collapsed,
  setCollapsed
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'Admin';

  const navItems = getNavItems(role);

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login');
    });
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen transition-all duration-300 ease-in-out bg-indigo-950 text-slate-300 flex flex-col shadow-2xl lg:shadow-none max-lg:w-[84vw] max-lg:max-w-[330px] max-lg:rounded-r-[2rem] max-lg:border-r max-lg:border-white/10",
      collapsed
        ? "-translate-x-full lg:translate-x-0 lg:w-20"
        : "translate-x-0 w-64 shadow-indigo-900/40"
    )}>
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-indigo-900/50">
        <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "opacity-0 hidden")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            E
          </div>
          <span className="text-lg font-semibold text-white truncate">EduSync ERP</span>
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-indigo-900 text-indigo-300 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-md">
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) {
                setCollapsed(true);
              }
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group max-lg:rounded-2xl max-lg:py-3.5",
              role === 'Teacher' && teacherMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
              role === 'Student' && studentMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
              role === 'Governing Body' && governingMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "hover:bg-indigo-900 hover:text-white"
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon size={20} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-indigo-900/50 mt-auto">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-indigo-300 hover:bg-rose-500/10 hover:text-rose-400 transition-colors group",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="font-medium text-sm whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
