import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Bell, Search, Menu, User, Mail, Shield, LogOut, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';

export const Header = ({ 
  collapsed, 
  setCollapsed 
}: { 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void 
}) => {
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden sm:flex items-center w-80 relative">
            <Search size={18} className="absolute left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="h-10 w-full bg-slate-100 border-transparent rounded-xl pl-10 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>
          
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 border-l border-slate-200 pl-4 sm:pl-6 cursor-pointer group hover:bg-slate-50 py-1 transition-colors rounded-lg"
          >
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{user?.name}</span>
              <span className="text-xs font-medium text-slate-500">{user?.role}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="My Profile">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-4">
             <div className="w-24 h-24 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold shadow-2xl shadow-indigo-200 border-4 border-white">
                {user?.name?.charAt(0)}
             </div>
             <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">{user?.role}</p>
             </div>
             <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                   <CheckCircle size={10} /> Account Verified
                </span>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm"><User size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">User ID</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.id}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm"><Mail size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.email}</p>
                </div>
             </div>
             <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-violet-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Access Role</p>
                  <p className="text-sm font-semibold text-slate-700">{user?.role}</p>
                </div>
             </div>
             {user?.role === 'Teacher' && (
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                   <div className="p-2.5 bg-white text-amber-600 rounded-xl shadow-sm"><Shield size={20} /></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Assigned Subject</p>
                     <p className="text-sm font-semibold text-slate-700">{user?.subject}</p>
                   </div>
                </div>
             )}
          </div>

           <div className="pt-6 border-t border-slate-100 flex gap-3">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-bold hover:bg-rose-100 transition-colors"
              >
                 <LogOut size={18} /> Sign Out Profile
              </button>
           </div>
        </div>
      </Modal>
    </>
  );
};
