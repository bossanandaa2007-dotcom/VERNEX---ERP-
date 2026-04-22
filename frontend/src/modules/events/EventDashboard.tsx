import { useState } from 'react';
import { Calendar as CalendarIcon, Users, Trophy, ExternalLink, CalendarPlus, CheckCircle, Smartphone } from 'lucide-react';
import { mockEvents } from '../../mock-data';
import { useAuthStore } from '../../store/useAuthStore';
import Modal from '../../components/common/Modal';

const EventDashboard = () => {
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const handleLinkEvent = () => {
    setNotification('Event linking wizard started. Select external calendar source.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRegisterClick = (name: string) => {
    setSelectedEvent(name);
    setIsModalOpen(true);
  };

  const handleRegistrationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNotification(`Successfully registered for "${selectedEvent}"! Confirmation sent to email.`);
    setIsModalOpen(false);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 lg:pb-12 h-full">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activities & Events</h1>
          <p className="text-slate-500 mt-1">Institutional event portal and registration management.</p>
        </div>
        {user?.role !== 'Student' && (
          <button 
            onClick={handleLinkEvent}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm active:scale-95"
          >
             <CalendarPlus size={16} /> Create New Event
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-indigo-500">
            <CheckCircle size={20} />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Linked Events', value: '6', icon: CalendarIcon, color: 'bg-indigo-500' },
          { title: 'Total Registrations', value: '450', icon: Users, color: 'bg-blue-500' },
          { title: 'Completed Events', value: '18', icon: Trophy, color: 'bg-emerald-500' },
        ].map((stat, i) => (
           <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
             <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                <stat.icon size={24} />
              </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {mockEvents.map((evt) => (
          <div key={evt.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col transition-shadow hover:shadow-md relative overflow-hidden group">
             {evt.status === 'Open' && (
               <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-1 text-xs font-bold uppercase translate-x-6 translate-y-3 rotate-45">
                 Open Now
               </div>
             )}
             <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-rose-500 font-bold uppercase pb-0.5 border-b border-slate-200">APR</span>
                  <span className="text-lg font-extrabold text-slate-700 mt-0.5">{evt.date.split('-')[2]}</span>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors pr-8">{evt.name}</h3>
                   <div className="flex items-center gap-2 mt-1">
                     <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium text-[10px] rounded uppercase tracking-wide">{evt.type}</span>
                     <span className="text-slate-500 text-xs">Target: {evt.targetAudience}</span>
                   </div>
                </div>
             </div>
             
             <p className="text-slate-600 text-sm flex-1 leading-relaxed">
               {evt.description}
             </p>

             <div className="border-t border-slate-100 mt-6 pt-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm z-[40] bg-indigo-400">U1</div>
                   <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm z-[30] bg-indigo-500">U2</div>
                   <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm z-[20] bg-indigo-600">U3</div>
                   <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm z-0">
                    +42
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRegisterClick(evt.name)}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors active:scale-95"
                >
                  Register Now <ExternalLink size={16} />
                </button>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Register for ${selectedEvent}`}>
        <form onSubmit={handleRegistrationSubmit} className="space-y-4">
           <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Event Selection</p>
              <p className="text-sm font-semibold text-indigo-900">{selectedEvent}</p>
           </div>
           <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Student ID / Enrollment No.</label>
              <input required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="e.g. S102938" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Contact Number</label>
              <div className="relative">
                 <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input type="tel" required className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Participation Type</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all">
                 <option>Solo Participant</option>
                 <option>Team Lead</option>
                 <option>Volunteer</option>
                 <option>Audience Member</option>
              </select>
            </div>
          <div className="pt-4 flex gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Cancel</button>
             <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Complete Registration</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default EventDashboard;
