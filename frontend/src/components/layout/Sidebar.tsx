import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard, Users, Shield, CheckCircle, Award,
  Library, IndianRupee, Calendar, FileText, Settings,
  BookOpen, BarChart3, LogOut, ChevronLeft, ChevronRight,
  Building2, CalendarDays, ClipboardList, type LucideIcon
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
}

const getNavItems = (role: string) => {
  const items: NavItem[] = [];

  // always add a single dashboard entry for allowed roles
  if (role !== 'Accountant') {
    items.push({ name: 'Dashboard', icon: LayoutDashboard, path: `/${role === 'Governing Body' ? 'governing' : role.toLowerCase()}/dashboard` });
  }

  if (role === 'Admin') {
    items.push(
      { name: 'Classes Mgmt', icon: Building2, path: '/admin/classes' },
      { name: 'Students', icon: Users, path: '/admin/students' },
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
      { name: 'Smart Attendance', icon: Shield, path: '/teacher/ai-attendance' },
      { name: 'Marks Hub', icon: Award, path: '/teacher/marks-entry' },
      { name: 'Leave Requests', icon: ClipboardList, path: '/teacher/leave-requests' },
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
      { name: 'Leave Request', icon: ClipboardList, path: '/student/leave-requests' },
      { name: 'Complaints', icon: FileText, path: '/student/complaints' },
      { name: 'Study Materials', icon: BookOpen, path: '/student/materials' },
      { name: 'Calendar', icon: Calendar, path: '/student/calendar' },
      { name: 'Assignments', icon: FileText, path: '/student/assignments' },
      { name: 'Fees', icon: IndianRupee, path: '/student/fees' }
    );
  }

  if (role === 'Accountant') {
    items.push(
      { name: 'Fees & Finance', icon: IndianRupee, path: '/accountant/fees' },
      { name: 'Reports', icon: FileText, path: '/accountant/reports' }
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
      { name: 'Teachers', icon: Users, path: '/governing/dashboard?view=teachers' },
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
  const location = useLocation();
  const role = user?.role || 'Admin';

  const navItems = getNavItems(role);
  const currentLocation = `${location.pathname}${location.search}`;
  const isNavItemActive = (path: string, name: string, isActive: boolean) => {
    if (role !== 'Governing Body') {
      return isActive;
    }

    if (path.startsWith('/governing/dashboard')) {
      return currentLocation === path || (name === 'Dashboard' && (currentLocation === '/governing/dashboard' || currentLocation === '/governing/dashboard?view=dashboard'));
    }

    return location.pathname === path;
  };

  const handleLogout = () => {
    void logout().finally(() => {
      navigate(role === 'Student' ? '/student-login' : '/login');
    });
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-800 bg-[#10213a] text-slate-300 shadow-lg transition-all duration-200 ease-in-out lg:shadow-none max-lg:w-[84vw] max-lg:max-w-[300px]",
      collapsed
        ? "-translate-x-full lg:translate-x-0 lg:w-20"
        : "translate-x-0 w-60 shadow-slate-900/30"
    )}>
      {/* Brand */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-800 px-3.5 py-3">
        <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "opacity-0 hidden")}>
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#4653a6] text-sm font-semibold text-white">
            E
          </div>
          <span className="truncate text-[15px] font-semibold text-white">EduSync ERP</span>
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
            <ChevronLeft size={19} strokeWidth={1.8} />
          </button>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto rounded bg-[#4653a6] p-2 text-white transition-colors hover:bg-[#5260b4]">
            <ChevronRight size={19} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-2.5">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 1024) {
                setCollapsed(true);
              }
            }}
            className={({ isActive }) => {
              const active = isNavItemActive(item.path, item.name, isActive);

              return cn(
                "group flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors duration-150 max-lg:py-2.5",
                role === 'Teacher' && teacherMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
                role === 'Student' && studentMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
                role === 'Governing Body' && governingMobilePrimaryPaths.has(item.path) && 'max-lg:hidden',
                active
                  ? "bg-[#4653a6] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              );
            }}
            title={collapsed ? item.name : undefined}
          >
            <item.icon size={18} strokeWidth={1.8} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span className="whitespace-nowrap font-medium">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="mt-auto border-t border-slate-800 p-2.5">
        <button
          onClick={handleLogout}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span className="whitespace-nowrap font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};
