import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockUsers } from '../mock-data';

export type ComplaintStatus = 'OPEN' | 'RESOLVED';
export type ComplaintType = 'Academic' | 'Infrastructure' | 'Discipline' | 'Hostel' | 'Other';
export type ComplaintPriority = 'Low' | 'Medium' | 'High';
export type ComplaintDivision = 'Boys' | 'Girls';

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  division: ComplaintDivision;
  title: string;
  description: string;
  type: ComplaintType;
  targetId: string;
  targetRole: 'Teacher' | 'Governing Body' | 'Unknown';
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  response?: string;
  resolvedAt?: string;
}

interface ComplaintState {
  complaints: Complaint[];
  submitComplaint: (complaint: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'targetRole'>) => Complaint;
  syncComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, status: ComplaintStatus, response?: string) => void;
}

const resolveTargetRole = (targetId: string): Complaint['targetRole'] => {
  const matchedUser = mockUsers.find((user) => user.id.toLowerCase() === targetId.toLowerCase());

  if (!matchedUser) {
    return 'Unknown';
  }

  if (matchedUser.role === 'Teacher' || matchedUser.role === 'Governing Body') {
    return matchedUser.role;
  }

  return 'Unknown';
};

export const useComplaintStore = create<ComplaintState>()(
  persist(
    (set) => ({
      complaints: [
        {
          id: 'cmp-1001',
          studentId: 's101',
          studentName: 'Arjun Kumar',
          class: '10-A',
          section: 'A',
          division: 'Boys',
          title: 'Projector not working',
          description: 'The classroom projector has not been working for the past two days during maths class.',
          type: 'Infrastructure',
          targetId: 't1',
          targetRole: 'Teacher',
          priority: 'Medium',
          status: 'OPEN',
          createdAt: '2026-04-18T09:30:00.000Z',
        },
        {
          id: 'cmp-1002',
          studentId: 's101',
          studentName: 'Arjun Kumar',
          class: '10-A',
          section: 'A',
          division: 'Boys',
          title: 'Study hall water issue',
          description: 'The water purifier near the study hall has been empty since yesterday afternoon.',
          type: 'Hostel',
          targetId: 'u2',
          targetRole: 'Governing Body',
          priority: 'High',
          status: 'OPEN',
          createdAt: '2026-04-17T13:15:00.000Z',
        },
      ],
      submitComplaint: (complaint) => {
        const nextComplaint: Complaint = {
          ...complaint,
          id: `cmp-${Date.now()}`,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          targetRole: resolveTargetRole(complaint.targetId),
        };

        set((state) => ({
          complaints: [nextComplaint, ...state.complaints],
        }));

        return nextComplaint;
      },
      syncComplaint: (complaint) =>
        set((state) => {
          const exists = state.complaints.some((item) => item.id === complaint.id);

          return exists
            ? state
            : {
                complaints: [complaint, ...state.complaints],
              };
        }),
      updateComplaint: (id, status, response) =>
        set((state) => ({
          complaints: state.complaints.map((complaint) =>
            complaint.id === id
              ? {
                  ...complaint,
                  status,
                  response,
                  resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : complaint.resolvedAt,
                }
              : complaint
          ),
        })),
    }),
    { name: 'complaint-storage' }
  )
);
