import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { cn } from '../utils/cn';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { useAuthStore } from '../store/useAuthStore';

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isMobileAppRole = user?.mainRole === 'teacher' || user?.mainRole === 'student' || user?.mainRole === 'governing_body';
  const sidebarCollapsed = isMobile ? !isMobileSidebarOpen : collapsed;
  const setSidebarCollapsed = (nextCollapsed: boolean) => {
    if (isMobile) {
      setIsMobileSidebarOpen(!nextCollapsed);
      return;
    }

    setCollapsed(nextCollapsed);
  };

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobile((currentIsMobile) => {
        if (currentIsMobile !== nextIsMobile) {
          setIsMobileSidebarOpen(false);
          setCollapsed(false);
        }

        return nextIsMobile;
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.innerWidth < 1024) {
        setIsMobileSidebarOpen(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      return;
    }

    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    const refreshCharts = () => {
      window.dispatchEvent(new Event('resize'));
    };

    let nestedFrame = 0;
    const firstFrame = window.requestAnimationFrame(refreshCharts);
    const secondFrame = window.requestAnimationFrame(() => {
      nestedFrame = window.requestAnimationFrame(refreshCharts);
    });
    const timer = window.setTimeout(refreshCharts, 180);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.cancelAnimationFrame(nestedFrame);
      window.clearTimeout(timer);
    };
  }, [sidebarCollapsed, location.pathname, location.search]);

  return (
    <div className={cn("min-h-screen bg-slate-50 flex", isMobileAppRole && "max-lg:bg-slate-50")}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-[45] bg-slate-900/45 lg:hidden transition-opacity duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <div className={cn(
          "flex-1 flex min-w-0 flex-col min-h-screen transition-all duration-200 ease-in-out",
        isMobileAppRole && "max-lg:w-full max-lg:max-w-full max-lg:overflow-x-hidden",
        collapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Header collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        
        <main ref={mainRef} className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:p-6",
          isMobileAppRole && "mobile-dashboard-main max-lg:px-2.5 max-lg:pb-[calc(6rem+env(safe-area-inset-bottom))] max-lg:pt-2.5 max-lg:bg-slate-50"
        )}>
          <div className={cn("mx-auto max-w-[1280px]", isMobileAppRole && "max-lg:w-full max-lg:max-w-full max-lg:min-w-0")}>
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomNav role={user?.mainRole} />
    </div>
  );
};

export default DashboardLayout;
