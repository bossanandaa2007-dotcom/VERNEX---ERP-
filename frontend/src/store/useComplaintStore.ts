import { create } from 'zustand';

export type ComplaintStatus = 'OPEN' | 'RESOLVED';
export type ComplaintType = 'Academic' | 'Infrastructure' | 'Discipline' | 'Hostel' | 'Fees' | 'Other';
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
  targetType?: 'Class Teacher' | 'Subject Teacher' | 'Governing Body';
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  response?: string;
  resolvedAt?: string;
}

interface ComplaintState {
  complaints: Complaint[];
  setComplaints: (complaints: Complaint[]) => void;
  syncComplaint: (complaint: Complaint) => void;
  updateComplaint: (id: string, status: ComplaintStatus, response?: string) => void;
}

export const useComplaintStore = create<ComplaintState>()((set) => ({
  complaints: [],
  setComplaints: (complaints) => set({ complaints }),
  syncComplaint: (complaint) =>
    set((state) => {
      const exists = state.complaints.some((item) => item.id === complaint.id);

      if (!exists) {
        return {
          complaints: [complaint, ...state.complaints],
        };
      }

      return {
        complaints: state.complaints.map((item) => (item.id === complaint.id ? complaint : item)),
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
}));
