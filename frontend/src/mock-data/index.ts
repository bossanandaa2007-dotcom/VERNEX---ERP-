export const mockUsers = [
  { id: "u1", name: "Admin User", email: "admin@school.edu", password: "password", role: "Admin" },
  { id: "u2", name: "Dr. Robert Wilson", email: "governing@school.edu", password: "password", role: "Governing Body" },
  { id: "u3", name: "Ms. Kavitha Rao", email: "accountant@school.edu", password: "password", role: "Accountant" },
  // Teachers
  { id: "t1", name: "Mr. Rajesh Kumar", email: "teacher@school.edu", password: "password", role: "Teacher", subject: "Mathematics", standards: ["10-A", "10-B"], classes: ["10-A", "10-B"] },
  { id: "t2", name: "Ms. Anjali Mehta", email: "anjali@school.edu", password: "password", role: "Teacher", subject: "Science", standards: ["10-A", "9-A"], classes: ["10-A", "9-A"] },
  { id: "t3", name: "Mr. Vivek Sharma", email: "vivek@school.edu", password: "password", role: "Teacher", subject: "English", standards: ["10-A", "10-B"], classes: ["10-A", "10-B"] },
  { id: "t4", name: "Ms. Kavya R", email: "kavya@school.edu", password: "password", role: "Teacher", subject: "Computer Science", standards: ["10-A", "10-C"], classes: ["10-A", "10-C"] },
  { id: "t5", name: "Mr. Arun Prakash", email: "arun@school.edu", password: "password", role: "Teacher", subject: "Social Studies", standards: ["10-A", "10-B"], classes: ["10-A", "10-B"] },
  // Sample Student Account
  { id: "s101", name: "Arjun Kumar", email: "student@school.edu", password: "password", role: "Student", standard: "10th", class: "10-A", section: "A" },
];

export const mockStudents = [
  { id: "s101", name: "Arjun Kumar", email: "arjun@school.edu", standard: "10th", class: "10-A", section: "A", status: "Active", attendance: 95, gender: "Male", dob: "2008-05-14", rollNo: "101" },
  { id: "s102", name: "Priya Sharma", email: "priya@school.edu", standard: "10th", class: "10-A", section: "A", status: "Active", attendance: 92, gender: "Female", dob: "2008-08-22", rollNo: "102" },
  { id: "s103", name: "Rahul Verma", email: "rahul@school.edu", standard: "10th", class: "10-B", section: "B", status: "Active", attendance: 88, gender: "Male", dob: "2008-11-10", rollNo: "103" },
  { id: "s104", name: "Sneha Reddy", email: "sneha@school.edu", standard: "10th", class: "10-B", section: "B", status: "Active", attendance: 94, gender: "Female", dob: "2008-03-05", rollNo: "104" },
  { id: "s105", name: "Karthik S", email: "karthik@school.edu", standard: "10th", class: "10-C", section: "C", status: "Active", attendance: 85, gender: "Male", dob: "2008-12-15", rollNo: "105" },
];

export const mockAttendance = [
  { id: "a1", studentEmail: "student@school.edu", date: "2026-04-01", status: "Present" },
  { id: "a2", studentEmail: "charlie@school.edu", date: "2026-04-01", status: "Absent" },
];

export const mockEvents = [
  {
    id: "e1",
    name: "Annual Science Fair",
    date: "2026-04-15",
    description: "Showcase your science projects and win amazing prizes.",
    type: "Academic",
    targetAudience: "Entire school",
    status: "Open",
  },
  {
    id: "e2",
    name: "Inter-School Sports Meet",
    date: "2026-05-10",
    description: "Compete in various track and field events.",
    type: "Sports",
    targetAudience: "Entire school",
    status: "Upcoming",
  },
];

export const mockBooks = [
  {
    id: "b1",
    title: "Understanding Physics",
    author: "H.C. Verma",
    category: "Science",
    isbn: "978-3-16-148410-0",
    totalCopies: 10,
    availableCopies: 8,
    status: "Available",
  },
  {
    id: "b2",
    title: "Advanced Mathematics",
    author: "R.D. Sharma",
    category: "Maths",
    isbn: "978-0-12-345678-9",
    totalCopies: 5,
    availableCopies: 0,
    status: "Not Available",
  },
];

export const mockFees = [
  {
    id: "f1",
    studentEmail: "student@school.edu",
    totalAmount: 5000,
    paidAmount: 2000,
    pendingAmount: 3000,
    dueDate: "2026-04-15",
    type: "Tuition Fee",
    status: "Pending",
  },
];

export const mockAssignments = [
  {
    id: "asgn1",
    title: "Quarterly Math Project",
    subject: "Mathematics",
    class: "10-A",
    deadline: "2026-04-10",
    description: "Submit a detailed report on Trigonometric applications.",
    submissions: [
      { studentEmail: "student@school.edu", submittedAt: "2026-04-05", file: "trig_report.pdf" }
    ]
  },
  {
    id: "asgn2",
    title: "Physics Lab Record",
    subject: "Physics",
    class: "10-A",
    deadline: "2026-04-12",
    description: "Upload your completed lab observations for Optics experiments.",
    submissions: []
  }
];

export const mockStudyMaterials = [
  {
    id: "sm1",
    title: "Matrices and Determinants Notes",
    subject: "Mathematics",
    class: "10-A",
    uploadDate: "2026-04-01",
    file: "matrices_notes.pdf"
  },
  {
    id: "sm2",
    title: "Optics - Ray Diagrams Guide",
    subject: "Physics",
    class: "10-A",
    uploadDate: "2026-03-28",
    file: "optics_guide.pdf"
  }
];

export const mockGranularAttendance = [
  { subject: "Mathematics", present: 22, total: 24 },
  { subject: "Physics", present: 18, total: 20 },
  { subject: "Chemistry", present: 19, total: 20 },
  { subject: "English", present: 15, total: 15 },
  { subject: "History", present: 12, total: 14 },
];

export const mockNotifications = [
  {
    id: "n1",
    title: "Exam Schedule Released",
    message: "Final term exams start on 20th April.",
    type: "General",
    timestamp: "2 hours ago",
    read: false,
    targetRoles: ["Student", "Teacher"],
  },
  {
    id: "n2",
    title: "Fee Due Reminder",
    message: "Please pay your pending fees by 15th April.",
    type: "Fee",
    timestamp: "1 day ago",
    read: true,
    targetRoles: ["Student"],
  },
];
