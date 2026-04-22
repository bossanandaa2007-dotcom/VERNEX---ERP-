import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  rollNumber: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  teacherRemarks?: string;
  timestamp: string;
  updatedAt: string;
}

interface LeaveState {
  requests: LeaveRequest[];
  submitRequest: (request: Omit<LeaveRequest, 'id' | 'status' | 'timestamp' | 'updatedAt'>) => void;
  updateStatus: (id: string, status: LeaveRequest['status'], remarks?: string) => void;
}

export const useLeaveStore = create<LeaveState>()(
  persist(
    (set) => ({
      requests: [
        {
          id: 'l1',
          studentId: 's101',
          studentName: 'Arjun Kumar',
          class: '10-A',
          rollNumber: '101',
          teacherId: 't1',
          teacherName: 'Mr. Rajesh Kumar',
          startDate: '2026-04-12',
          endDate: '2026-04-14',
          reason: 'Family function at hometown.',
          status: 'Pending',
          timestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      submitRequest: (req) => set((state) => ({
        requests: [
          ...state.requests,
          {
            ...req,
            id: Math.random().toString(36).substr(2, 9),
            status: 'Pending',
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      })),
      updateStatus: (id, status, remarks) => set((state) => ({
        requests: state.requests.map(r => r.id === id ? { 
          ...r, 
          status, 
          teacherRemarks: remarks,
          updatedAt: new Date().toISOString() 
        } : r)
      })),
    }),
    { name: 'leave-storage' }
  )
);
