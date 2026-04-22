import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExamType = 'Unit Test' | 'Quarterly' | 'Half Yearly' | 'Annual';

export const EXAM_TYPES: ExamType[] = ['Unit Test', 'Quarterly', 'Half Yearly', 'Annual'];

const legacyExamTypeMap: Record<string, ExamType> = {
  Internal: 'Unit Test',
  Semester: 'Quarterly',
  Assignment: 'Annual',
};

const normalizeExamType = (examType: string): ExamType =>
  legacyExamTypeMap[examType] ?? (EXAM_TYPES.includes(examType as ExamType) ? (examType as ExamType) : 'Unit Test');

const createSeedMarks = (): Mark[] => [
  {
    id: 'm1',
    studentId: 's101',
    studentName: 'Arjun Kumar',
    class: '10-A',
    subject: 'Mathematics',
    marks: 78,
    maxMarks: 100,
    examType: 'Unit Test',
    teacherId: 't1',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm2',
    studentId: 's101',
    studentName: 'Arjun Kumar',
    class: '10-A',
    subject: 'Mathematics',
    marks: 84,
    maxMarks: 100,
    examType: 'Quarterly',
    teacherId: 't1',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm3',
    studentId: 's101',
    studentName: 'Arjun Kumar',
    class: '10-A',
    subject: 'Mathematics',
    marks: 88,
    maxMarks: 100,
    examType: 'Half Yearly',
    teacherId: 't1',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm4',
    studentId: 's101',
    studentName: 'Arjun Kumar',
    class: '10-A',
    subject: 'Mathematics',
    marks: 91,
    maxMarks: 100,
    examType: 'Annual',
    teacherId: 't1',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'm5',
    studentId: 's102',
    studentName: 'Priya Sharma',
    class: '10-A',
    subject: 'Mathematics',
    marks: 82,
    maxMarks: 100,
    examType: 'Quarterly',
    teacherId: 't1',
    timestamp: new Date().toISOString(),
  }
];

export interface Mark {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType: ExamType;
  teacherId: string;
  timestamp: string;
}

interface MarksState {
  marks: Mark[];
  addMark: (mark: Omit<Mark, 'id' | 'timestamp'>) => void;
  updateMark: (id: string, updatedMark: Partial<Mark>) => void;
  deleteMark: (id: string) => void;
}

export const useMarksStore = create<MarksState>()(
  persist(
    (set) => ({
      marks: createSeedMarks(),
      addMark: (mark) => set((state) => ({
        marks: [...state.marks, { ...mark, id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString() }]
      })),
      updateMark: (id, updatedMark) => set((state) => ({
        marks: state.marks.map((m) => (m.id === id ? { ...m, ...updatedMark } : m))
      })),
      deleteMark: (id) => set((state) => ({
        marks: state.marks.filter((m) => m.id !== id)
      })),
    }),
    {
      name: 'marks-storage',
      version: 2,
      migrate: (persistedState: any) => {
        const persistedMarks = Array.isArray(persistedState?.marks) ? persistedState.marks : [];

        return {
          ...persistedState,
          marks: persistedMarks.length
            ? persistedMarks.map((mark: Mark) => ({
                ...mark,
                examType: normalizeExamType(mark.examType),
              }))
            : createSeedMarks(),
        };
      },
    }
  )
);
