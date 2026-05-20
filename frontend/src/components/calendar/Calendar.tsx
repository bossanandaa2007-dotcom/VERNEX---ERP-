import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus,
  Trash2, X, Filter, Clock
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  isSameMonth, parseISO
} from 'date-fns';
import Modal from '../common/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import { createEvent, deleteEvent, fetchEvents, updateEvent, type SchoolEvent } from '../../services/erpContent';

type EventType = 'Holiday' | 'Festival' | 'Event';
type EventScope = 'All' | 'Department' | 'Specific Class';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  scope: EventScope;
  description: string;
}

interface CalendarProps {
  isAdmin?: boolean;
}

const cn = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

const mapDbEventToCalendarEvent = (event: SchoolEvent): CalendarEvent => ({
  id: event.id,
  title: event.name,
  date: event.date,
  time: '',
  type: event.type === 'Holiday' || event.type === 'Festival' ? event.type : 'Event',
  scope: event.targetAudience === 'Department' ? 'Department' : event.targetAudience === 'Specific Class' ? 'Specific Class' : 'All',
  description: event.description,
});

const mapCalendarEventToDbEvent = (event: Omit<CalendarEvent, 'id'>): Omit<SchoolEvent, 'id'> => ({
  name: event.title,
  date: event.date,
  description: event.description,
  type: event.type,
  targetAudience: event.scope,
  status: 'Open',
});

const Calendar = ({ isAdmin = false }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<EventType | 'All'>('All');
  const canManageEvents = isAdmin || user?.role === 'Admin' || user?.role === 'Teacher';

  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    type: 'Event',
    scope: 'All',
    description: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const dbEvents = await fetchEvents();
        if (isMounted) {
          setEvents(dbEvents.map(mapDbEventToCalendarEvent));
        }
      } catch (error) {
        console.error('Failed to load calendar events:', error);
      }
    };

    void loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => filterType === 'All' || event.type === filterType)
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

  const renderHeader = () => (
    <div className="mb-5 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-black text-slate-900 lg:font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">Calendar events are loaded from Supabase.</p>
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end lg:gap-4">
        <div className="grid flex-1 grid-cols-[44px_1fr_44px] items-center rounded-2xl border border-slate-100 bg-white p-1 shadow-sm lg:flex-none lg:flex lg:rounded-xl">
          <button onClick={prevMonth} className="flex h-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-50">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="h-10 rounded-xl px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 lg:font-semibold">
            Today
          </button>
          <button onClick={nextMonth} className="flex h-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-50">
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
            className="flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-white shadow-md shadow-indigo-600/20 transition-all active:scale-95 hover:bg-indigo-700 lg:h-auto lg:rounded-xl lg:py-2.5"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Event</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="mb-2 grid grid-cols-7">
        {days.map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 lg:text-xs lg:font-bold">
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
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-sm">
        {daysInterval.map((day, index) => {
          const isSelected = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayEvents = filteredEvents.filter((event) => isSameDay(parseISO(event.date), day));

          return (
            <div
              key={index}
              className={cn(
                'min-h-[58px] bg-white p-1.5 transition-colors lg:min-h-[120px] lg:p-2',
                !isCurrentMonth && 'bg-slate-50/50 text-slate-300'
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-all lg:text-sm lg:font-semibold',
                  isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'
                )}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-1 lg:space-y-1.5">
                {dayEvents.slice(0, 1).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={cn(
                      'w-full cursor-pointer overflow-hidden rounded-lg px-1.5 py-1 text-left shadow-sm transition-all lg:rounded-xl lg:px-3 lg:py-2.5',
                      getEventBlockStyles(event.type)
                    )}
                  >
                    <div className="truncate text-[9px] font-bold leading-tight text-white lg:text-[11px]">{event.title}</div>
                  </div>
                ))}
                {dayEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(dayEvents[1])}
                    className="w-full rounded-lg bg-slate-100 px-1 py-0.5 text-[9px] font-black text-slate-500 lg:hidden"
                  >
                    +{dayEvents.length - 1}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEvent) {
        const updated = await updateEvent(editingEvent.id, mapCalendarEventToDbEvent(formData));
        setEvents((current) => current.map((event) => event.id === editingEvent.id ? mapDbEventToCalendarEvent(updated) : event));
      } else {
        const created = await createEvent(mapCalendarEventToDbEvent(formData));
        setEvents((current) => [...current, mapDbEventToCalendarEvent(created)]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save calendar event:', error);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) {
      return;
    }

    try {
      await deleteEvent(editingEvent.id);
      setEvents((current) => current.filter((event) => event.id !== editingEvent.id));
      setEditingEvent(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-1.5rem)] lg:max-w-6xl">
      {renderHeader()}

      <div className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter size={16} />
          <span>Filter:</span>
        </div>
        <div className="grid grid-cols-4 gap-2 lg:flex">
          {(['All', 'Holiday', 'Festival', 'Event'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'rounded-xl border px-2 py-2 text-xs font-bold transition-all lg:rounded-lg lg:px-3 lg:py-1.5',
                filterType === type
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-2.5 shadow-xl shadow-slate-200/50 lg:rounded-3xl lg:p-4">
        {renderDays()}
        {renderCells()}
      </div>

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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  placeholder="e.g. Science Exhibition"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
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
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Applicable Scope</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value as EventScope })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 bg-slate-50/50 transition-all outline-none"
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
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

            <div className="grid grid-cols-1 gap-3 text-sm min-[380px]:grid-cols-2 lg:gap-4">
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
