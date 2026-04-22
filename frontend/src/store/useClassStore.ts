import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ITeacher {
    id: string;
    name: string;
    category: string;
    subject: string;
    qualification: string;
    experience: string;
    contact: string;
    email: string;
    assignedClass: string;
}

export interface IStudent {
    id: string;
    name: string;
    rollNo: string;
    categoryId: string;
    sectionId: string;
    gender: 'Male' | 'Female' | 'Other';
    dob: string;
    contact: string;
    parentName: string;
    parentContact: string;
    address: string;
}

export interface ISection {
    id: string;
    categoryId: string;
    name: string; // e.g. LKG-A
    classTeacher: string;
    strength: number;
    roomNumber?: string;
}

export interface IClassCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
}

export interface IClassState {
    categories: IClassCategory[];
    sections: ISection[];
    teachers: ITeacher[];
    students: IStudent[];
    inCharges: Record<string, any[]>;

    // CRUD Actions
    addTeacher: (teacher: Omit<ITeacher, 'id'>) => void;
    deleteTeacher: (id: string) => void;

    addSection: (section: Omit<ISection, 'id'>) => void;
    deleteSection: (id: string) => void;

    addStudent: (student: Omit<IStudent, 'id'>) => void;
    deleteStudent: (id: string) => void;
}

// SEED DATA GENERATOR
const generateTeachers = (category: string, count: number) => {
    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology'];
    return Array.from({ length: count }, (_, i) => ({
        id: `T-${category}-${i}-${Date.now()}`,
        name: ['Dr. Anjali Sharma', 'Prof. Robert Wilson', 'Mrs. Kavya Singh', 'Mr. Vivek Das', 'Ms. Sarah Miller', 'Mr. Rajesh Kumar'][i % 6] + (i > 5 ? ` ${i}` : ''),
        category,
        subject: subjects[i % subjects.length],
        qualification: i % 2 === 0 ? 'M.Sc, B.Ed' : 'Ph.D, M.Ed',
        experience: `${(i % 15) + 5} years`,
        contact: `+91 98000${1000 + i}`,
        email: `staff.${category}${i}@eduerp.org`,
        assignedClass: category.charAt(0).toUpperCase() + category.slice(1)
    }));
};

const generateStudents = (category: string, section: string, count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: `S-${section}-${i}-${Date.now()}`,
        name: ['Arjun Kumar', 'Priya Sharma', 'Rahul Verma', 'Sneha Reddy', 'Karthik S', 'Meena K', 'Rohit Das', 'Divya N', 'Akash M', 'Pooja S'][i % 10] + (i > 9 ? ` ${i}` : ''),
        rollNo: (100 + i + 1).toString(),
        categoryId: category,
        sectionId: section,
        gender: i % 2 === 0 ? 'Male' as const : 'Female' as const,
        dob: `20${(i % 5) + 12}-05-15`,
        contact: `+91 95000${2000 + i}`,
        parentName: ['Raj Kumar', 'Sita Sharma', 'Vijay Verma', 'K. Reddy'][i % 4],
        parentContact: `+91 95000${3000 + i}`,
        address: '123, Academic Square, Block-B, New Delhi'
    }));
};

export const useClassStore = create<IClassState>()(
    persist(
        (set) => ({
            categories: [
                { id: 'kindergarten', name: 'Kindergarten', description: 'Early Childhood Education (LKG & UKG)', icon: 'Baby' },
                { id: 'primary', name: 'Primary', description: 'Standard 1st to 5th basic education', icon: 'BookOpen' },
                { id: 'secondary', name: 'Secondary', description: 'Advanced learning for 6th to 10th', icon: 'GraduationCap' },
                { id: 'higher-secondary', name: 'Higher Secondary', description: 'Professional prep for 11th & 12th', icon: 'Building2' },
            ],
            sections: [
                // KINDERGARTEN (Section 7: 3 Sections)
                { id: 'lkg-a', categoryId: 'kindergarten', name: 'LKG-A', classTeacher: 'Anjali Sharma', strength: 20, roomNumber: 'K-01' },
                { id: 'lkg-b', categoryId: 'kindergarten', name: 'LKG-B', classTeacher: 'Kavya Singh', strength: 20, roomNumber: 'K-02' },
                { id: 'ukg-a', categoryId: 'kindergarten', name: 'UKG-A', classTeacher: 'Saira Bano', strength: 20, roomNumber: 'K-03' },
                // PRIMARY (Section 7: 3 Sections)
                { id: 'p1-a', categoryId: 'primary', name: '1-A', classTeacher: 'Robert Wilson', strength: 20, roomNumber: 'P-101' },
                { id: 'p2-a', categoryId: 'primary', name: '2-A', classTeacher: 'Sunita Rao', strength: 20, roomNumber: 'P-102' },
                { id: 'p3-a', categoryId: 'primary', name: '3-A', classTeacher: 'Vikram Seth', strength: 20, roomNumber: 'P-103' },
                // SECONDARY (Section 7: 3 Sections)
                { id: 's6-a', categoryId: 'secondary', name: '6-A', classTeacher: 'John Smith', strength: 20, roomNumber: 'S-201' },
                { id: 's7-a', categoryId: 'secondary', name: '7-A', classTeacher: 'Sarah Miller', strength: 20, roomNumber: 'S-202' },
                { id: 's8-a', categoryId: 'secondary', name: '8-A', classTeacher: 'David Ray', strength: 20, roomNumber: 'S-203' },
                // HIGHER SECONDARY (Section 7: 3 Sections)
                { id: 'h11-a', categoryId: 'higher-secondary', name: '11-A', classTeacher: 'Rajesh Kumar', strength: 20, roomNumber: 'HS-301' },
                { id: 'h11-b', categoryId: 'higher-secondary', name: '11-B', classTeacher: 'Anita Desai', strength: 20, roomNumber: 'HS-302' },
                { id: 'h12-a', categoryId: 'higher-secondary', name: '12-A', classTeacher: 'Amit Shah', strength: 20, roomNumber: 'HS-303' },
            ],
            inCharges: {
                kindergarten: [
                    { role: 'Head of Section', name: 'Dr. Emily Watson', experience: '18 Years', contact: '+91 98888 11111' },
                    { role: 'Deputy Head', name: 'Mrs. Meena Sen', experience: '12 Years', contact: '+91 98888 22222' }
                ],
                primary: [{ role: 'Head of Section', name: 'Mr. Johnathan Gray', experience: '20 Years', contact: '+91 98888 33333' }],
                secondary: [{ role: 'Head of Section', name: 'Dr. Amar Gupta', experience: '22 Years', contact: '+91 98888 44444' }],
                'higher-secondary': [{ role: 'Head of Section', name: 'Prof. S.K. Bose', experience: '25 Years', contact: '+91 98888 55555' }]
            },
            teachers: [
                ...generateTeachers('kindergarten', 25),
                ...generateTeachers('primary', 25),
                ...generateTeachers('secondary', 25),
                ...generateTeachers('higher-secondary', 25),
            ],
            students: [
                ...generateStudents('kindergarten', 'lkg-a', 20),
                ...generateStudents('kindergarten', 'lkg-b', 20),
                ...generateStudents('kindergarten', 'ukg-a', 20),
                ...generateStudents('primary', 'p1-a', 20),
                ...generateStudents('primary', 'p2-a', 20),
                ...generateStudents('secondary', 's6-a', 20),
                ...generateStudents('higher-secondary', 'h11-a', 20),
            ],

            addTeacher: (teacher) => set((state) => ({ teachers: [...state.teachers, { ...teacher, id: `T-${Date.now()}` }] })),
            deleteTeacher: (id) => set((state) => ({ teachers: state.teachers.filter(t => t.id !== id) })),

            addSection: (section) => set((state) => ({ sections: [...state.sections, { ...section, id: `SEC-${Date.now()}` }] })),
            deleteSection: (id) => set((state) => ({ sections: state.sections.filter(s => s.id !== id) })),

            addStudent: (student) => set((state) => ({ students: [...state.students, { ...student, id: `S-${Date.now()}` }] })),
            deleteStudent: (id) => set((state) => ({ students: state.students.filter(s => s.id !== id) })),
        }),
        { name: 'full-erp-management-storage' }
    )
);
