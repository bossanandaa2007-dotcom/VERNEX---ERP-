import { useState } from 'react';
import { Shield, Bell, User, Monitor, Key, CheckCircle, Smartphone, Lock, Globe } from 'lucide-react';
import Modal from '../../components/common/Modal';

const SettingsPage = () => {
  const [notification, setNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { title: 'Account Settings', icon: User, items: ['Profile Information', 'Email Preferences', 'Language & Region'] },
    { title: 'Security Control', icon: Shield, items: ['Change Password', 'Two-Factor Authentication', 'Login History'] },
    { title: 'Notifications', icon: Bell, items: ['Push Notifications', 'Email Digests', 'Alert Thresholds'] },
    { title: 'System Config', icon: Monitor, items: ['School Branding', 'Academic Calendar', 'Role Permissions'] },
  ];

  const handleManage = (section: string) => {
    setActiveSection(section);
    setIsModalOpen(true);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(`${activeSection} preferences updated successfully!`);
    setIsModalOpen(false);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-1">Configure your portal experience and manage platform-wide preferences.</p>
      </div>

       {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
            <CheckCircle size={20} className="text-indigo-400" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {sections.map((section, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <section.icon size={22} />
                 </div>
                 <h2 className="text-lg font-bold text-slate-900 leading-tight">{section.title}</h2>
              </div>
              <div className="space-y-1 flex-1">
                 {section.items.map((item, j) => (
                    <div key={j} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors font-medium cursor-default">
                       {item}
                    </div>
                 ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                 <button 
                  onClick={() => handleManage(section.title)}
                  className="w-full text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-widest text-[10px]"
                 >
                  Manage {section.title} →
                 </button>
              </div>
           </div>
         ))}
      </div>

       <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 bg-rose-50/20">
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
               <Key size={20} />
            </div>
            <h2 className="text-lg font-bold text-rose-900">Advanced Control Panel</h2>
         </div>
         <p className="text-sm text-rose-600 mb-6 max-w-2xl">Access critical system logs, perform data backups, or reset system configurations. These actions require administrator authorization and cannot be undone.</p>
         <div className="flex gap-4">
            <button 
              onClick={() => handleManage('Security Data')}
              className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold shadow-md shadow-rose-600/20 hover:bg-rose-700 transition-colors text-sm active:scale-95"
            >
              Backup Database
            </button>
            <button className="px-5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl font-semibold hover:bg-rose-50 transition-colors text-sm">System Logs</button>
         </div>
       </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Configure ${activeSection}`}>
          <form onSubmit={handleSaveSettings} className="space-y-6">
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-3">
                      <Lock size={18} className="text-slate-400" />
                      <div>
                         <p className="text-sm font-bold text-slate-900">Encrypted Mode</p>
                         <p className="text-xs text-slate-500">Enable AES-256 for local storage</p>
                      </div>
                   </div>
                   <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-3">
                      <Smartphone size={18} className="text-slate-400" />
                      <div>
                         <p className="text-sm font-bold text-slate-900">Push Notifications</p>
                         <p className="text-xs text-slate-500">Real-time mobile updates</p>
                      </div>
                   </div>
                   <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-3">
                      <Globe size={18} className="text-slate-400" />
                      <div>
                         <p className="text-sm font-bold text-slate-900">Regional Sync</p>
                         <p className="text-xs text-slate-500">Automatic timezone detection</p>
                      </div>
                   </div>
                   <input type="checkbox" className="w-5 h-5 accent-indigo-600" />
                </div>
             </div>
             
             <div className="pt-4 flex gap-3">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Discard</button>
               <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Apply Changes</button>
            </div>
          </form>
       </Modal>
    </div>
  );
};

export default SettingsPage;
