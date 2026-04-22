import { useClassStore } from '../../store/useClassStore';
import type { ISection, IStudent } from '../../store/useClassStore';

export interface FinanceLevel {
  id: string;
  name: string;
  studentCount: number;
  classCount: number;
}

export interface FinanceClass {
  id: string;
  levelId: string;
  name: string;
  sectionCount: number;
  studentCount: number;
}

export interface FinanceSection {
  id: string;
  classId: string;
  name: string;
  classTeacher: string;
  roomNumber?: string;
  studentCount: number;
}

export interface FinanceStudent extends IStudent {
  feesPaid: boolean;
  termFees: number;
  amountPaid: number;
}

const levelNameMap: Record<string, string> = {
  kindergarten: 'Kindergarten',
  primary: 'Primary',
  secondary: 'Secondary',
  'higher-secondary': 'Higher Secondary',
};

const pendingRollNumbers = new Set(['103', '107', '112', '118']);

const feePlanByCategory: Record<string, number> = {
  kindergarten: 5000,
  primary: 6500,
  secondary: 8000,
  'higher-secondary': 9500,
};

const extractClassName = (sectionName: string) => sectionName.split('-')[0];

const buildClassId = (levelId: string, className: string) => `${levelId}:${className}`;

const resolveFeesPaid = (student: IStudent) => !pendingRollNumbers.has(student.rollNo);
const resolveTermFees = (student: IStudent) => feePlanByCategory[student.categoryId] ?? 6000;
const resolveAmountPaid = (student: IStudent) => {
  const termFees = resolveTermFees(student);

  return resolveFeesPaid(student) ? termFees : Math.round(termFees * 0.55);
};

export const fetchLevels = async (): Promise<FinanceLevel[]> => {
  const { categories, sections, students } = useClassStore.getState();

  return categories.map((category) => {
    const levelSections = sections.filter((section) => section.categoryId === category.id);
    const classCount = new Set(levelSections.map((section) => extractClassName(section.name))).size;

    return {
      id: category.id,
      name: levelNameMap[category.id] || category.name,
      studentCount: students.filter((student) => student.categoryId === category.id).length,
      classCount,
    };
  });
};

export const fetchClasses = async (levelId: string): Promise<FinanceClass[]> => {
  const { sections, students } = useClassStore.getState();
  const levelSections = sections.filter((section) => section.categoryId === levelId);
  const classMap = new Map<string, ISection[]>();

  levelSections.forEach((section) => {
    const className = extractClassName(section.name);
    classMap.set(className, [...(classMap.get(className) || []), section]);
  });

  return Array.from(classMap.entries()).map(([className, classSections]) => ({
    id: buildClassId(levelId, className),
    levelId,
    name: className,
    sectionCount: classSections.length,
    studentCount: students.filter((student) => classSections.some((section) => section.id === student.sectionId)).length,
  }));
};

export const fetchSections = async (classId: string): Promise<FinanceSection[]> => {
  const { sections, students } = useClassStore.getState();
  const [levelId, className] = classId.split(':');

  return sections
    .filter((section) => section.categoryId === levelId && extractClassName(section.name) === className)
    .map((section) => ({
      id: section.id,
      classId,
      name: section.name,
      classTeacher: section.classTeacher,
      roomNumber: section.roomNumber,
      studentCount: students.filter((student) => student.sectionId === section.id).length,
    }));
};

export const fetchStudents = async (sectionId: string): Promise<FinanceStudent[]> => {
  const { students } = useClassStore.getState();

  return students
    .filter((student) => student.sectionId === sectionId)
    .map((student) => ({
      ...student,
      termFees: resolveTermFees(student),
      amountPaid: resolveAmountPaid(student),
      feesPaid: resolveFeesPaid(student),
    }));
};
