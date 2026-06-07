import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-5 border-l-4 border-blue-700 pl-4 text-left">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
            <img src="/vernex-logo.png" alt="VerneX School ERP" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">VerneX School ERP</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue to your assigned workspace.</p>
        </div>
        
        <Outlet />
        
        <div className="mt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} VerneX School ERP. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
