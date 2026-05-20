import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 mb-4">
            <span className="text-2xl font-bold">ERP</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>
        
        <Outlet />
        
        <div className="mt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} School ERP System. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
