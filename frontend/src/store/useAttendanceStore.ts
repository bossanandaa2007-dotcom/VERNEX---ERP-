import { create } from 'zustand';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string;
  status: 'Present' | 'Absent';
  source: 'AI' | 'Manual';
  confidenceScore: number;
  originalImageReference?: string;
  metadata?: {
    consensus: number;
    engines: string[];
    reasoning: string;
  };
}

interface AttendanceState {
  records: AttendanceRecord[];
  addRecords: (newRecords: Omit<AttendanceRecord, 'id'>[]) => void;
  getRecordsByDate: (date: string, classId: string) => AttendanceRecord[];
}

export const useAttendanceStore = create<AttendanceState>()((set, get) => ({
  records: [],
  addRecords: (newRecords) => {
    const recordsWithIds = newRecords.map(r => ({
      ...r,
      id: Math.random().toString(36).substring(7)
    }));
    set((state) => ({
      records: [...state.records, ...recordsWithIds]
    }));
  },
  getRecordsByDate: (date, classId) => {
    return get().records.filter(r => r.date === date && r.classId === classId);
  }
}));
