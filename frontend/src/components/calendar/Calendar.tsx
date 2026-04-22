import { useMemo, useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, 
  Trash2, X, Filter, Clock
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, 
  isSameMonth, parseISO 
} from 'date-fns';
import { useCalendarStore } from '../../store/useCalendarStore';
import type { CalendarEvent, EventType, EventScope } from '../../store/useCalendarStore';
import { cn } from '../../components/layout/Sidebar';
import Modal from '../common/Modal';
import { useAuthStore } from '../../store/useAuthStore';

interface CalendarProps {
  isAdmin?: boolean;
}

const Calendar = ({ isAdmin = false }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuthStore();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<EventType | 'All'>('All');
  const canManageEvents = isAdmin || user?.role === 'Admin' || user?.role === 'Governing Body';
  
  // Form State
  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    type: 'Event',
    scope: 'All',
    description: '',
  });

  const filteredEvents = useMemo(
    () =>
      events
        .filter((e) => filterType === 'All' || e.type === filterType)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.time || '99:99').localeCompare(b.time || '99:99');
        }),
    [events, filterType]
  );

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getEventBlockStyles = (type: EventType) =>
    type === 'Holiday'
      ? 'bg-rose-500 text-white hover:bg-rose-600'
      : type === 'Festival'
        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
        : 'bg-blue-500 text-white hover:bg-blue-600';

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h2>
          <p className="text-slate-500 text-sm">Manage institutional holidays and events</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-100 p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
          {canManageEvents && (
            <button 
              onClick={() => {
                setEditingEvent(null);
                setFormData({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '', type: 'Event', scope: 'All', description: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 font-semibold"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add Event</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {daysInterval.map((d, i) => {
          const isSelected = isSameDay(d, new Date());
          const isCurrentMonth = isSameMonth(d, monthStart);
          const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.date), d));

          return (
            <div 
              key={i} 
              className={cn(
                "min-h-[120px] bg-white p-2 transition-colors",
                !isCurrentMonth && "bg-slate-50/50 text-slate-300"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-sm font-semibold h-7 w-7 flex items-center justify-center rounded-full transition-all",
                  isSelected ? "bg-indigo-600 text-white shadow-md" : "text-slate-700"
                )}>
                  {format(d, 'd')}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-all shadow-sm",
                      "overflow-hidden cursor-pointer",
                      getEventBlockStyles(event.type)
                    )}
                  >
                    <div className="truncate text-[11px] font-bold leading-tight text-white">{event.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateEvent(editingEvent.id, formData);
    } else {
      addEvent(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {renderHeader()}
      
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={16} />
          <span>Filter:</span>
        </div>
        <div className="flex gap-2">
          {(['All', 'Holiday', 'Festival', 'Event'] as const).map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                filterType === type 
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {type}
            </button>
          ))}
        </div>
        
        <div className="ml-auto hidden sm:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Festival</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Event</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
        {renderDays()}
        {renderCells()}
      </div>

      {/* Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Event Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  placeholder="e.g. Science Exhibition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  >
                    <option value="Holiday">Holiday</option>
                    <option value="Festival">Festival</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Time (Optional)</label>
                <input
                  type="time"
                  value={formData.time || ''}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Applicable Scope</label>
                <select 
                  value={formData.scope}
                  onChange={e => setFormData({ ...formData, scope: e.target.value as EventScope })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                >
                  <option value="All">All Institution</option>
                  <option value="Department">Department Specific</option>
                  <option value="Specific Class">Specific Class</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                {editingEvent && (
                  <button 
                    type="button"
                    onClick={() => { deleteEvent(editingEvent.id); setIsModalOpen(false); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors font-bold"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border', getEventBlockStyles(selectedEvent.type))}>
                {selectedEvent.type}
              </span>
              {selectedEvent.time && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <Clock size={12} />
                  {selectedEvent.time}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date</p>
                <p className="mt-1 font-semibold text-slate-900">{format(parseISO(selectedEvent.date), 'dd MMM yyyy')}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scope</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedEvent.scope}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</p>
              <p className="mt-2 text-sm text-slate-700">
                {selectedEvent.description || 'No additional details provided.'}
              </p>
            </div>

            {canManageEvents && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setFormData({ ...selectedEvent });
                    setSelectedEvent(null);
                    setIsModalOpen(true);
                  }}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  Edit Event
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Calendar;
