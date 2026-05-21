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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  const selectedDateEvents = useMemo(
    () =>
      selectedDate
        ? filteredEvents.filter((event) => isSameDay(parseISO(event.date), selectedDate))
        : [],
    [filteredEvents, selectedDate]
  );

  const getEventTone = (type: EventType) =>
    type === 'Holiday'
      ? {
          block: 'bg-amber-100 text-amber-900 ring-amber-200',
          strong: 'bg-amber-400 text-slate-950',
          dot: 'bg-amber-400',
          label: 'border-amber-200 bg-amber-50 text-amber-700',
        }
      : type === 'Festival'
        ? {
            block: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
            strong: 'bg-emerald-500 text-white',
            dot: 'bg-emerald-500',
            label: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          }
        : {
            block: 'bg-blue-100 text-blue-900 ring-blue-200',
            strong: 'bg-blue-500 text-white',
            dot: 'bg-blue-500',
            label: 'border-blue-200 bg-blue-50 text-blue-700',
          };

  const getDayTone = (dayEvents: CalendarEvent[]) => {
    const primary = dayEvents.find((event) => event.type === 'Event')
      || dayEvents.find((event) => event.type === 'Festival')
      || dayEvents.find((event) => event.type === 'Holiday');

    return primary ? getEventTone(primary.type) : null;
  };

  const renderHeader = () => (
    <div className="mb-5 flex flex-col gap-4 lg:mb-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">School Calendar</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 lg:text-3xl">{format(currentMonth, 'MMMM yyyy')}</h2>
      </div>
      <div className="flex items-center justify-between gap-3 lg:justify-end lg:gap-4">
        <div className="grid flex-1 grid-cols-[44px_1fr_44px] items-center rounded-2xl border border-slate-100 bg-white p-1 shadow-sm lg:flex-none lg:flex">
          <button onClick={prevMonth} className="flex h-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-50" aria-label="Previous month">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="h-10 rounded-xl px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 lg:font-semibold">
            Today
          </button>
          <button onClick={nextMonth} className="flex h-10 items-center justify-center rounded-xl transition-colors hover:bg-slate-50" aria-label="Next month">
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
            className="flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-white shadow-md shadow-slate-200 transition-all active:scale-95 hover:bg-slate-800 lg:h-auto lg:py-2.5"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Event</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return (
      <div className="mb-2 grid grid-cols-7 px-1">
        {days.map((day) => (
          <div key={day} className="py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 lg:text-xs">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {daysInterval.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayEvents = filteredEvents.filter((event) => isSameDay(parseISO(event.date), day));
          const tone = getDayTone(dayEvents);
          const canOpenDetails = dayEvents.length > 0;

          return (
            <button
              key={index}
              type="button"
              onClick={() => canOpenDetails && setSelectedDate(day)}
              disabled={!canOpenDetails}
              className={cn(
                'group relative flex aspect-square min-h-12 flex-col items-center justify-center rounded-2xl border text-center transition-all sm:min-h-16 lg:min-h-24',
                tone
                  ? `${tone.block} border-transparent ring-1 shadow-sm hover:-translate-y-0.5 hover:shadow-md`
                  : 'border-slate-100 bg-white text-slate-800 hover:border-slate-200 hover:bg-slate-50',
                !isCurrentMonth && !tone && 'bg-slate-50/60 text-slate-300',
                !canOpenDetails && 'cursor-default hover:translate-y-0 hover:shadow-none',
                isToday && 'ring-2 ring-indigo-300'
              )}
            >
              <span className="text-sm font-black sm:text-base lg:text-lg">{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <div className="absolute bottom-2 flex items-center justify-center gap-1">
                  {Array.from(new Set(dayEvents.map((event) => event.type))).slice(0, 3).map((type) => (
                    <span key={type} className={cn('h-1.5 w-1.5 rounded-full ring-2 ring-white', getEventTone(type).dot)} />
                  ))}
                  {dayEvents.length > 1 && (
                    <span className="ml-0.5 text-[9px] font-black text-current opacity-70">+{dayEvents.length - 1}</span>
                  )}
                </div>
              )}
              {isToday && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </button>
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
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
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

      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Selected Date</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
                  {format(selectedDate, 'dd MMMM yyyy')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                aria-label="Close calendar notice"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5 sm:p-6">
              {selectedDateEvents.map((event) => {
                const tone = getEventTone(event.type);

                return (
                  <article key={event.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider', tone.label)}>
                            {event.type}
                          </span>
                          {event.time && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              <Clock size={12} />
                              {event.time}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {event.scope}
                          </span>
                        </div>
                        <h4 className="mt-3 text-lg font-black text-slate-950">{event.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {event.description || 'No additional details provided.'}
                        </p>
                      </div>

                      {canManageEvents && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(event);
                            setFormData({ ...event });
                            setSelectedDate(null);
                            setIsModalOpen(true);
                          }}
                          className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
