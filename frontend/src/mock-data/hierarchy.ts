export const classCategories = [
    { id: 'kindergarten', name: 'Kindergarten', icon: 'Baby', color: 'bg-pink-500', theme: 'pink' },
    { id: 'primary', name: 'Primary', icon: 'BookOpen', color: 'bg-blue-500', theme: 'blue' },
    { id: 'secondary', name: 'Secondary', icon: 'GraduationCap', color: 'bg-purple-500', theme: 'purple' },
    { id: 'higher-secondary', name: 'Higher Secondary', icon: 'Building2', color: 'bg-orange-500', theme: 'orange' },
];

export const mockInCharges = {
    kindergarten: [
        { role: 'Head of Section', name: 'Mrs. Sarah James', exp: '15 years', contact: '9876543210' },
        { role: 'Deputy Head', name: 'Ms. Meena Gupta', exp: '10 years', contact: '9876543211' },
        { role: 'Coordinator', name: 'Mrs. Anita Das', exp: '8 years', contact: '9876543212' },
    ],
    primary: [
        { role: 'Head of Section', name: 'Mr. David Miller', exp: '18 years', contact: '9876543220' },
        { role: 'Coordinator', name: 'Ms. Kavita Singh', exp: '12 years', contact: '9876543221' },
    ],
    // Add more as needed
};

export const mockTeachers = [
    // Kindergarten
    ...Array.from({ length: 25 }, (_, i) => ({
        id: `tk${i + 1}`,
        name: ['Anjali Sharma', 'Kavya R', 'Priya Menon', 'Sunita Rao', 'Arun Das'][i % 5] + ` ${i + 1}`,
        category: 'kindergarten',
        subject: ['Phonics', 'Rhymes', 'Activity', 'Art', 'Maths'][i % 5],
        qualification: 'M.Ed / B.Ed',
        experience: `${(i % 10) + 2} years`,
        contact: `98000000${i + 10}`
    })),
    // Primary
    ...Array.from({ length: 25 }, (_, i) => ({
        id: `tp${i + 1}`,
        name: ['Robert Wilson', 'Anjali Mehta', 'Rajesh Kumar', 'Sita Ram', 'Vikram S'][i % 5] + ` ${i + 1}`,
        category: 'primary',
        subject: ['English', 'Mathematics', 'EVS', 'Hindi', 'Music'][i % 5],
        qualification: 'M.A / B.Ed',
        experience: `${(i % 12) + 5} years`,
        contact: `97000000${i + 10}`
    })),
    // Secondary
    ...Array.from({ length: 25 }, (_, i) => ({
        id: `ts${i + 1}`,
        name: ['Dr. Amar', 'Mrs. Rekha', 'Mr. John', 'Ms. Sheela', 'Mr. Vivek'][i % 5] + ` ${i + 1}`,
        category: 'secondary',
        subject: ['Physics', 'Chemistry', 'History', 'Geography', 'Biology'][i % 5],
        qualification: 'Ph.D / M.Sc',
        experience: `${(i % 15) + 8} years`,
        contact: `96000000${i + 10}`
    })),
];

export const mockSections = [
    { id: 'lkg-a', category: 'kindergarten', name: 'LKG-A', students: 10, teacher: 'Anjali Sharma' },
    { id: 'lkg-b', category: 'kindergarten', name: 'LKG-B', students: 10, teacher: 'Kavya R' },
    { id: 'primary-1a', category: 'primary', name: '1st-A', students: 15, teacher: 'Rajesh Kumar' },
    { id: 'secondary-8a', category: 'secondary', name: '8th-A', students: 20, teacher: 'Vivek Sharma' },
];

export const mockStudents = [
    ...Array.from({ length: 150 }, (_, i) => ({
        id: `s${i + 101}`,
        name: ['Arjun Kumar', 'Priya Sharma', 'Rahul Verma', 'Sneha Reddy', 'Karthik S', 'Meena K', 'Rohit Das', 'Divya N', 'Akash M', 'Pooja S'][i % 10],
        rollNo: `${101 + (i % 50)}`,
        sectionId: ['lkg-a', 'lkg-b', 'primary-1a', 'secondary-8a'][i % 4],
        gender: i % 2 === 0 ? 'Male' : 'Female',
        contact: `9500000${i + 100}`
    }))
];
