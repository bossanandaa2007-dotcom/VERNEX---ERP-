import { create } from 'zustand';
import {
    addTeacherSubjectAssignment,
    createSectionRecord,
    createStudentRecord,
    createStudentRecords,
    createTeacherRecord,
    deleteSectionRecord,
    deleteStudentRecord,
    deleteTeacherRecord,
    fetchTeacherManagementDetails,
    fetchSchoolData,
    removeTeacherSubjectAssignment,
    updateTeacherRecord,
} from '../services/schoolData';
import type { IClassCategory, IClassSubjectGroup, ISection, IStudent, ITeacher } from '../types/school';
import type { FacultyAssignmentOption, TeacherManagementDetails } from '../services/schoolData';
export type { IClassCategory, ISection, IStudent, ITeacher } from '../types/school';

export interface IClassState {
    categories: IClassCategory[];
    curriculumGroups: IClassSubjectGroup[];
    sections: ISection[];
    teachers: ITeacher[];
    students: IStudent[];
    inCharges: Record<string, any[]>;
    isLoading: boolean;
    initialized: boolean;
    initialize: () => Promise<void>;
    reset: () => void;
    refresh: () => Promise<void>;

    // CRUD Actions
    addTeacher: (teacher: Omit<ITeacher, 'id'>) => Promise<void>;
    deleteTeacher: (id: string) => Promise<void>;
    fetchTeacherManagementDetails: (teacherId: string) => Promise<TeacherManagementDetails>;
    updateTeacherRecord: (teacherId: string, updates: {
        name: string;
        email: string;
        category: string;
        subject: string;
        subjects: string[];
        qualification: string;
        experience: string;
        contact: string;
        classTeacherSectionId: string | null;
        classTeacherSubject: string | null;
    }) => Promise<void>;
    addTeacherSubjectAssignment: (teacherId: string, assignment: FacultyAssignmentOption) => Promise<void>;
    removeTeacherSubjectAssignment: (teacherId: string, sectionId: string, subject: string) => Promise<void>;

    addSection: (section: Omit<ISection, 'id'>) => Promise<void>;
    deleteSection: (id: string) => Promise<void>;

    addStudent: (student: Omit<IStudent, 'id'>) => Promise<void>;
    addStudents: (students: Array<Omit<IStudent, 'id'>>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
}

export const useClassStore = create<IClassState>()(
    (set, get) => ({
        categories: [],
        curriculumGroups: [],
        sections: [],
        teachers: [],
        students: [],
        inCharges: {},
        isLoading: false,
        initialized: false,
        initialize: async () => {
            if (get().initialized || get().isLoading) {
                return;
            }

            set({ isLoading: true });

            try {
                const data = await fetchSchoolData();
                set({
                    ...data,
                    inCharges: {},
                    isLoading: false,
                    initialized: true,
                });
            } catch (error) {
                console.error('Failed to load school data:', error);
                set({ isLoading: false });
            }
        },
        reset: () => {
            set({
                categories: [],
                curriculumGroups: [],
                sections: [],
                teachers: [],
                students: [],
                inCharges: {},
                isLoading: false,
                initialized: false,
            });
        },
        refresh: async () => {
            if (get().isLoading) {
                return;
            }

            set({
                categories: [],
                curriculumGroups: [],
                sections: [],
                teachers: [],
                students: [],
                inCharges: {},
                initialized: false,
                isLoading: true,
            });

            try {
                const data = await fetchSchoolData();
                set({
                    ...data,
                    inCharges: {},
                    isLoading: false,
                    initialized: true,
                });
            } catch (error) {
                console.error('Failed to refresh school data:', error);
                set({ isLoading: false });
            }
        },

        addTeacher: async (teacher) => {
            const createdTeacher = await createTeacherRecord(teacher);
            set((state) => ({ teachers: [createdTeacher, ...state.teachers] }));
        },
        deleteTeacher: async (id) => {
            await deleteTeacherRecord(id);
            set((state) => ({ teachers: state.teachers.filter((teacher) => teacher.id !== id) }));
        },
        fetchTeacherManagementDetails: async (teacherId) => fetchTeacherManagementDetails(teacherId),
        updateTeacherRecord: async (teacherId, updates) => {
            await updateTeacherRecord(teacherId, updates);
            await get().refresh();
        },
        addTeacherSubjectAssignment: async (teacherId, assignment) => {
            await addTeacherSubjectAssignment(teacherId, assignment);
            await get().refresh();
        },
        removeTeacherSubjectAssignment: async (teacherId, sectionId, subject) => {
            await removeTeacherSubjectAssignment(teacherId, sectionId, subject);
            await get().refresh();
        },

        addSection: async (section) => {
            await createSectionRecord(section);
            await get().refresh();
        },
        deleteSection: async (id) => {
            await deleteSectionRecord(id);
            await get().refresh();
        },

        addStudent: async (student) => {
            const createdStudent = await createStudentRecord(student);
            set((state) => ({ students: [...state.students, createdStudent] }));
        },
        addStudents: async (students) => {
            const createdStudents = await createStudentRecords(students);
            set((state) => ({ students: [...state.students, ...createdStudents] }));
        },
        deleteStudent: async (id) => {
            await deleteStudentRecord(id);
            set((state) => ({ students: state.students.filter((student) => student.id !== id) }));
        },
    })
);
