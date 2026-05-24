import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { cn } from '../components/layout/Sidebar';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { useAuthStore } from '../store/useAuthStore';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isMobileAppRole = user?.role === 'Teacher' || user?.role === 'Student' || user?.role === 'Governing Body';

  // On small screens, collapse by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // trigger on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // auto collapse on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      return;
    }

    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className={cn("min-h-screen bg-slate-50 flex", isMobileAppRole && "max-lg:bg-slate-50")}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      {/* Mobile Sidebar Overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/45 lg:hidden transition-opacity duration-200"
          onClick={() => setCollapsed(true)}
        />
      )}

      <div className={cn(
          "flex-1 flex min-w-0 flex-col min-h-screen transition-all duration-200 ease-in-out",
        isMobileAppRole && "max-lg:w-full max-lg:max-w-full max-lg:overflow-x-hidden",
        collapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <main ref={mainRef} className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6",
          isMobileAppRole && "mobile-dashboard-main max-lg:px-2.5 max-lg:pb-[calc(6rem+env(safe-area-inset-bottom))] max-lg:pt-2.5 max-lg:bg-slate-50"
        )}>
          <div className={cn("mx-auto max-w-[1280px]", isMobileAppRole && "max-lg:w-full max-lg:max-w-full max-lg:min-w-0")}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav role={user?.role} />
    </div>
  );
};

export default DashboardLayout;
