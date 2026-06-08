import { create } from 'zustand';
import {
    addTeacherSubjectAssignment,
    addGradeSubjectRecord,
    createClassSubjectGroupRecord,
    createSectionRecord,
    createStudentRecord,
    createStudentRecords,
    deleteGradeSubjectRecord,
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
import type { FacultyAssignmentOption, StudentCreateInput, TeacherCreateInput, TeacherManagementDetails } from '../services/schoolData';
export type { IClassCategory, ISection, IStudent, ITeacher } from '../types/school';

export interface IClassState {
    categories: IClassCategory[];
    curriculumGroups: IClassSubjectGroup[];
    sections: ISection[];
    teachers: ITeacher[];
    students: IStudent[];
    inCharges: Record<string, unknown[]>;
    isLoading: boolean;
    initialized: boolean;
    initialize: () => Promise<void>;
    reset: () => void;
    refresh: () => Promise<void>;

    // CRUD Actions
    addTeacher: (teacher: TeacherCreateInput) => Promise<void>;
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

    addStudent: (student: StudentCreateInput) => Promise<void>;
    addStudents: (students: Array<Omit<IStudent, 'id'>>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;
    addGradeSubject: (gradeKey: string, subject: string) => Promise<void>;
    deleteGradeSubject: (gradeKey: string, subject: string) => Promise<void>;
}

const getSectionGradeKey = (sectionName: string) => {
    const normalized = sectionName.trim().replace(/^(class|std|standard)\s+/i, '');
    const match = normalized.match(/^(lkg|ukg|\d{1,2})/i);
    return match?.[1].toUpperCase() || '';
};

const getGradeLabel = (gradeKey: string) => (['LKG', 'UKG'].includes(gradeKey) ? gradeKey : `Class ${gradeKey}`);

const getGradeSections = (sections: ISection[], gradeKey: string) =>
    sections.filter((section) => getSectionGradeKey(section.name) === gradeKey);

const getGroupsForGrade = (groups: IClassSubjectGroup[], gradeSections: ISection[]) => {
    const gradeSectionNames = new Set(gradeSections.map((section) => section.name));
    return groups.filter((group) => group.sectionNames.some((sectionName) => gradeSectionNames.has(sectionName)));
};

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
        addGradeSubject: async (gradeKey, subject) => {
            const trimmedSubject = subject.trim();
            if (!trimmedSubject) {
                throw new Error('Subject is required.');
            }

            const state = get();
            const gradeSections = getGradeSections(state.sections, gradeKey);
            if (!gradeSections.length) {
                throw new Error('No sections found for this class group.');
            }

            let targetGroups = getGroupsForGrade(state.curriculumGroups, gradeSections);
            if (!targetGroups.length) {
                const categoryId = gradeSections[0].categoryId;
                const groupId = `grade-${gradeKey.toLowerCase()}-subjects`;
                await createClassSubjectGroupRecord(
                    groupId,
                    categoryId,
                    `${getGradeLabel(gradeKey)} Subjects`,
                    `Subjects assigned to ${getGradeLabel(gradeKey)} sections.`,
                    gradeSections.map((section) => section.id)
                );
                await get().refresh();
                targetGroups = getGroupsForGrade(get().curriculumGroups, gradeSections);
            }

            await Promise.all(targetGroups.map((group) => {
                const maxSortOrder = group.subjects.reduce((max, item) => Math.max(max, item.sortOrder), -1);
                return addGradeSubjectRecord(group.id, group.categoryId, trimmedSubject, maxSortOrder + 1);
            }));
            await get().refresh();
        },
        deleteGradeSubject: async (gradeKey, subject) => {
            const state = get();
            const gradeSections = getGradeSections(state.sections, gradeKey);
            const targetGroups = getGroupsForGrade(state.curriculumGroups, gradeSections);
            await deleteGradeSubjectRecord(targetGroups.map((group) => group.id), subject);
            await get().refresh();
        },
    })
);
