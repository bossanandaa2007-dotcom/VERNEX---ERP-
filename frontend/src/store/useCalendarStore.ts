import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EventType = 'Holiday' | 'Festival' | 'Event';
export type EventScope = 'All' | 'Department' | 'Specific Class';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  description?: string;
  scope: EventScope;
}

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [
        { id: '1', title: 'Summer Vacation', date: '2026-05-20', type: 'Holiday', scope: 'All', description: 'Annual summer break starts.' },
        { id: '2', title: 'Diwali', date: '2026-11-01', type: 'Festival', scope: 'All' },
        { id: '3', title: 'Annual Day', date: '2026-04-20', time: '10:00', type: 'Event', scope: 'All', description: 'School annual day celebration.' },
        { id: '4', title: 'Maths Seminar', date: '2026-04-12', time: '14:30', type: 'Event', scope: 'Specific Class', description: 'For Class 10-A.' },
      ],
      addEvent: (event) => set((state) => ({
        events: [...state.events, { ...event, id: Math.random().toString(36).substr(2, 9) }]
      })),
      updateEvent: (id, updatedEvent) => set((state) => ({
        events: state.events.map((e) => (e.id === id ? { ...e, ...updatedEvent } : e))
      })),
      deleteEvent: (id) => set((state) => ({
        events: state.events.filter((e) => e.id !== id)
      })),
    }),
    { name: 'calendar-storage' }
  )
);
