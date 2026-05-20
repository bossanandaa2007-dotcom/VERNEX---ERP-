export interface ITeacher {
  id: string;
  profileId?: string | null;
  name: string;
  category: string;
  subject: string;
  subjects?: string[];
  homeSectionSubject?: string;
  qualification: string;
  experience: string;
  contact: string;
  email: string;
  assignedClass: string;
  standards?: string[];
  classTeacherOf?: string;
  subjectTeacherSections?: string[];
}

export interface ISectionTeacher {
  id: string;
  name: string;
  subject: string;
}

export interface IStudent {
  id: string;
  profileId?: string | null;
  name: string;
  email?: string;
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
  name: string;
  classTeacher: string;
  subjectTeachers?: ISectionTeacher[];
  strength: number;
  roomNumber?: string;
}

export interface IClassCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface IClassSubjectDefinition {
  name: string;
  code: string;
  sortOrder: number;
}

export interface IClassSubjectGroup {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  sectionNames: string[];
  subjects: IClassSubjectDefinition[];
}
