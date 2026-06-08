import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Baby, BookOpen, GraduationCap, Building2,
    Plus, Trash2, ChevronRight, ArrowLeft,
    User, Shield, Users, Phone, Award,
    Briefcase, X, CheckCircle2, UserCheck,
    Calendar, AlertTriangle, MapPin, Hash, Upload, type LucideIcon
} from 'lucide-react';
import { useClassStore } from '../../store/useClassStore';
import type { IClassCategory, IClassSubjectGroup, IStudent, ITeacher } from '../../types/school';
import { getTodayInputDate } from '../../utils/dateLimits';

type AddModalState =
    | { type: 'SECTION' | 'TEACHER' | 'STUDENT' | 'BULK_STUDENTS' }
    | { type: 'SUBJECT'; gradeKey: string; gradeLabel: string };

type DeleteState =
    | { type: 'SECTION' | 'TEACHER' | 'STUDENT'; id: string; name: string }
    | { type: 'SUBJECT'; name: string; gradeKey: string; gradeLabel: string };

type ActiveProfile = ITeacher | IStudent | null;

interface InCharge {
    name: string;
    role: string;
    experience: string;
    contact: string;
}

interface IconButtonProps {
    icon: LucideIcon;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    variant?: 'gray' | 'blue' | 'red' | 'teal';
}

// ─── Shared Mini Components ────────────────────────────────────
const IconBtn = ({ icon: Icon, onClick, variant = 'gray' }: IconButtonProps) => {
    const cls: Record<string, string> = {
        gray: 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600',
        blue: 'bg-blue-50 text-blue-500 hover:bg-blue-100',
        red: 'bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600',
        teal: 'bg-teal-50 text-teal-500 hover:bg-teal-100',
    };
    return (
        <button
            onClick={onClick}
            className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${cls[variant]}`}
        >
            <Icon size={18} />
        </button>
    );
};

const Toast = ({ msg, onClose }: { msg: string; onClose: () => void }) => (
    <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[999]"
    >
        <CheckCircle2 size={20} className="text-teal-400" />
        <span className="font-bold text-sm">{msg}</span>
        <button onClick={onClose} className="ml-4 text-slate-400 hover:text-white"><X size={16} /></button>
    </motion.div>
);

// ─── Main Dashboard ────────────────────────────────────────────
const parseBulkStudentLine = (line: string) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"' && nextChar === '"') {
            current += '"';
            index += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (!inQuotes && (char === ',' || char === '\t')) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    cells.push(current.trim());
    return cells;
};

const normalizeBulkGender = (value: string): IStudent['gender'] => {
    const gender = value.trim().toLowerCase();
    if (gender === 'female' || gender === 'f') return 'Female';
    if (gender === 'other' || gender === 'o') return 'Other';
    return 'Male';
};

const parseBulkStudents = (
    input: string,
    categoryId: string,
    sectionId: string
): Array<Omit<IStudent, 'id'>> => {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const dataLines = lines.filter((line, index) => {
        if (index !== 0) return true;
        const [nameHeader, emailHeader] = parseBulkStudentLine(line).map((cell) => cell.toLowerCase());
        return !(nameHeader === 'name' && emailHeader === 'email');
    });

    return dataLines.map((line, index) => {
        const [name, email, rollNo, gender = 'Male', dob, contact, parentName, parentContact, address = 'New Delhi'] = parseBulkStudentLine(line);

        if (!name || !email || !rollNo || !dob || !contact || !parentName || !parentContact) {
            throw new Error(`Line ${index + 1} is missing required data.`);
        }

        return {
            name,
            email: email.toLowerCase(),
            rollNo,
            categoryId,
            sectionId,
            gender: normalizeBulkGender(gender),
            dob,
            contact,
            parentName,
            parentContact,
            address,
        };
    });
};

const getSectionGradeKey = (sectionName: string) => {
    const normalized = sectionName.trim().replace(/^(class|std|standard)\s+/i, '');
    const match = normalized.match(/^(lkg|ukg|\d{1,2})/i);
    return match?.[1].toUpperCase() || '';
};

const getGradeLabel = (gradeKey: string) => (['LKG', 'UKG'].includes(gradeKey) ? gradeKey : `Class ${gradeKey}`);

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error) {
        const message = String((error as { message?: unknown }).message || '').trim();
        if (message) return message;
    }

    return fallback;
};

const getPasswordValidationError = (password: string, confirmPassword: string) => {
    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }

    if (password !== confirmPassword) {
        return 'Password and confirm password do not match.';
    }

    return null;
};

const categoryIcons: Record<string, LucideIcon> = { Baby, BookOpen, GraduationCap, Building2 };

const findGradeCurriculumGroup = (
    groups: IClassSubjectGroup[],
    sectionNames: string[]
) => {
    const gradeSectionSet = new Set(sectionNames);
    const exactGroup = groups.find((group) =>
        group.sectionNames.length === sectionNames.length && group.sectionNames.every((name) => gradeSectionSet.has(name))
    );

    if (exactGroup) {
        return exactGroup;
    }

    return groups.find((group) => sectionNames.some((name) => group.sectionNames.includes(name))) || null;
};

export default function ClassesDashboard() {
    const store = useClassStore();
    const initialize = useClassStore((state) => state.initialize);

    const [view, setView] = useState<'DASHBOARD' | 'CATEGORY' | 'SECTION' | 'TEACHER_PROFILE' | 'STUDENT_PROFILE'>('DASHBOARD');
    const [activeCategoryID, setActiveCategoryID] = useState<string | null>(null);
    const [activeSectionID, setActiveSectionID] = useState<string | null>(null);
    const [activeProfile, setActiveProfile] = useState<ActiveProfile>(null);
    const [showModal, setShowModal] = useState<AddModalState | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<DeleteState | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [selectedGradeKey, setSelectedGradeKey] = useState<string>('');
    const [isSubjectSaving, setIsSubjectSaving] = useState(false);

    const activeClass = store.categories.find(c => c.id === activeCategoryID);
    const activeSection = store.sections.find(s => s.id === activeSectionID);
    const gradeOptions = useMemo(() => {
        const gradesByKey = new Map<string, string[]>();
        store.sections.forEach((section) => {
            const gradeKey = getSectionGradeKey(section.name);
            if (!gradeKey) {
                return;
            }

            gradesByKey.set(gradeKey, [...(gradesByKey.get(gradeKey) || []), section.name]);
        });

        return Array.from(gradesByKey.entries())
            .map(([key, sectionNames]) => ({
                key,
                label: getGradeLabel(key),
                sectionNames: sectionNames.sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
            }))
            .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
    }, [store.sections]);
    const selectedGrade = gradeOptions.find((grade) => grade.key === selectedGradeKey) || gradeOptions[0] || null;
    const selectedGradeGroup = useMemo(
        () => selectedGrade ? findGradeCurriculumGroup(store.curriculumGroups, selectedGrade.sectionNames) : null,
        [selectedGrade, store.curriculumGroups]
    );

    useEffect(() => {
        void initialize();
    }, [initialize]);

    useEffect(() => {
        if (!selectedGradeKey && gradeOptions.length) {
            setSelectedGradeKey(gradeOptions[0].key);
        }
    }, [gradeOptions, selectedGradeKey]);

    const notify = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'SECTION') await store.deleteSection(confirmDelete.id);
            if (confirmDelete.type === 'TEACHER') await store.deleteTeacher(confirmDelete.id);
            if (confirmDelete.type === 'STUDENT') await store.deleteStudent(confirmDelete.id);
            if (confirmDelete.type === 'SUBJECT') await store.deleteGradeSubject(confirmDelete.gradeKey, confirmDelete.name);
            setConfirmDelete(null);
            notify(confirmDelete.type === 'SUBJECT' ? `${confirmDelete.name} has been successfully deleted from ${confirmDelete.gradeLabel}.` : 'Entry removed from registry.');
        } catch (error: unknown) {
            notify(getErrorMessage(error, 'Delete failed.'));
        }
    };

    const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const get = (k: string) => fd.get(k) as string;

        try {
            setIsSubjectSaving(true);
            if (showModal?.type === 'SECTION') {
                await store.addSection({
                    name: get('name'), categoryId: activeCategoryID!,
                    classTeacher: get('teacher'), strength: parseInt(get('strength')) || 20,
                    roomNumber: get('room') || undefined,
                });
                notify('Section added successfully.');
            } else if (showModal?.type === 'TEACHER') {
                const passwordError = getPasswordValidationError(get('password') || '', get('confirmPassword') || '');
                if (passwordError) {
                    throw new Error(passwordError);
                }

                const teacherEmail = get('email').trim().toLowerCase();
                await store.addTeacher({
                    name: get('name'), subject: get('subject'), category: activeCategoryID!,
                    qualification: get('qual'), experience: get('exp'),
                    contact: get('phone'), email: teacherEmail, assignedClass: activeClass?.name || '',
                    standards: activeClass?.name ? [activeClass.name] : [],
                    password: get('password') || '',
                });
                notify('Teacher registered successfully. They can login with the password set by Admin.');
            } else if (showModal?.type === 'STUDENT') {
                const passwordError = getPasswordValidationError(get('password') || '', get('confirmPassword') || '');
                if (passwordError) {
                    throw new Error(passwordError);
                }

                const studentEmail = get('email').trim().toLowerCase();
                await store.addStudent({
                    name: get('name'), rollNo: get('roll'), categoryId: activeCategoryID!,
                    sectionId: activeSectionID!, gender: get('gender') as IStudent['gender'],
                    dob: get('dob'), contact: get('phone'),
                    parentName: get('parent'), parentContact: get('phone'), address: 'New Delhi',
                    email: studentEmail,
                    password: get('password') || '',
                });
                notify(`Student admitted. They can login with the password set by Admin.`);
            } else if (showModal?.type === 'BULK_STUDENTS') {
                const bulkStudents = parseBulkStudents(get('students'), activeCategoryID!, activeSectionID!);
                await store.addStudents(bulkStudents);
                notify(`${bulkStudents.length} students imported. Logins use Student@123.`);
            } else if (showModal?.type === 'SUBJECT') {
                if (!showModal.gradeKey) {
                    throw new Error('Choose a class group first.');
                }

                await store.addGradeSubject(showModal.gradeKey, get('subject'));
                notify(`${get('subject').trim()} added to ${showModal.gradeLabel}.`);
            }
        } catch (error: unknown) {
            notify(getErrorMessage(error, 'Registration failed.'));
            setIsSubjectSaving(false);
            return;
        }

        setIsSubjectSaving(false);
        setShowModal(null);
    };

    const renderModalStack = () => (
        <>
            <AnimatePresence>
                {showModal && (
                    <AddModal
                        key={showModal.type === 'SUBJECT' ? `SUBJECT:${showModal.gradeKey}` : showModal.type}
                        onClose={() => setShowModal(null)}
                        onSubmit={handleAdd}
                        type={showModal.type}
                        gradeLabel={showModal.type === 'SUBJECT' ? showModal.gradeLabel : undefined}
                        isSubmitting={isSubjectSaving}
                    />
                )}
                {confirmDelete && (
                    <DeleteConfirm
                        key={confirmDelete.type === 'SUBJECT' ? `SUBJECT:${confirmDelete.gradeKey}:${confirmDelete.name}` : `${confirmDelete.type}:${confirmDelete.name}`}
                        item={confirmDelete}
                        onCancel={() => setConfirmDelete(null)}
                        onConfirm={handleDelete}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast(null)} />}</AnimatePresence>
        </>
    );

    // ── DASHBOARD ──────────────────────────────────────────────────
    if (view === 'DASHBOARD') {
        return (
            <div className="p-10 max-w-7xl mx-auto min-h-screen bg-slate-50/20">
                <header className="mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Academic Administration</h1>
                    <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <Shield size={14} className="text-teal-500" /> {store.sections.length} Active Sections · {store.teachers.length} Faculty Members
                    </p>
                </header>

                <section className="mb-10 rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-500">Class Subject Groups</p>
                            <h2 className="mt-3 text-2xl font-black text-slate-900">Subjects are managed per grade and applied to every section in that grade.</h2>
                            <p className="mt-2 text-sm font-medium text-slate-500">Choose a class, add a subject, or remove a subject relationship from all matching sections.</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Select Class</label>
                                <select
                                    value={selectedGrade?.key || ''}
                                    onChange={(event) => setSelectedGradeKey(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                >
                                    {gradeOptions.map((grade) => (
                                        <option key={grade.key} value={grade.key}>{grade.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                disabled={!selectedGrade}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (!selectedGrade) return;
                                    setShowModal({ type: 'SUBJECT', gradeKey: selectedGrade.key, gradeLabel: selectedGrade.label });
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-100 transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                <Plus size={18} /> Add Subject
                            </button>
                        </div>
                    </div>

                    {selectedGrade && selectedGradeGroup && (
                        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-black text-slate-900">{selectedGrade.label}</h3>
                                    <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">
                                        {selectedGrade.sectionNames.length} Sections
                                    </span>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-500">Current source: {selectedGradeGroup.name}</p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {selectedGrade.sectionNames.map((sectionName) => (
                                        <span key={sectionName} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                            {sectionName}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Class Subjects</p>
                                <div className="mt-4 space-y-3">
                                    {selectedGradeGroup.subjects.map((subject) => (
                                        <div key={`${selectedGradeGroup.id}:${subject.name}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{subject.name}</p>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">{subject.code}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                    #{subject.sortOrder + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setConfirmDelete({ type: 'SUBJECT', name: subject.name, gradeKey: selectedGrade.key, gradeLabel: selectedGrade.label });
                                                    }}
                                                    className="rounded-xl bg-rose-50 p-2 text-rose-400 transition-all hover:bg-rose-100 hover:text-rose-600"
                                                    aria-label={`Delete ${subject.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedGradeGroup.subjects.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm font-bold text-slate-400">
                                            No subjects assigned yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {selectedGrade && !selectedGradeGroup && (
                        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm font-bold text-slate-500">
                            No subject group is mapped to {selectedGrade.label} yet. Add a subject to create the grade group.
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {store.categories.map((cat: IClassCategory) => {
                        const Icon = categoryIcons[cat.icon] || BookOpen;
                        return (
                            <motion.div
                                key={cat.id}
                                whileHover={{ y: -6, scale: 1.02 }}
                                onClick={() => { setActiveCategoryID(cat.id); setView('CATEGORY'); }}
                                className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 cursor-pointer group hover:shadow-2xl transition-all"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                    <Icon size={26} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-1">{cat.name}</h3>
                                <p className="text-xs font-bold text-slate-400 mb-8">{cat.description}</p>
                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1">
                                        <Users size={12} /> {store.sections.filter(s => s.categoryId === cat.id).length} Sections
                                    </span>
                                    <ChevronRight size={18} className="text-slate-200 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {renderModalStack()}
            </div>
        );
    }

    // ── CATEGORY PAGE ──────────────────────────────────────────────
    if (view === 'CATEGORY') {
        const teachers = store.teachers.filter(t => t.category === activeCategoryID);
        const sections = store.sections.filter(s => s.categoryId === activeCategoryID);
        const inCharges = (store.inCharges as Record<string, InCharge[]>)[activeCategoryID!] || [];

        return (
            <div className="p-10 max-w-7xl mx-auto min-h-screen">
                {/* Navbar */}
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                    <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                        <ArrowLeft size={20} /> Registry Overview
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowModal({ type: 'SECTION' })}
                            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Add Section
                        </button>
                    </div>
                </div>

                <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">{activeClass?.name}</h1>
                <p className="text-slate-500 font-medium mb-12">Class Registry — Sections & Faculty</p>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* In-Charge Panel */}
                    <div className="lg:col-span-1 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                            <Shield size={12} className="text-teal-500" /> Administration
                        </p>
                        {inCharges.map((ic: InCharge, i: number) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-300">{ic.name[0]}</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{ic.name}</h4>
                                        <p className="text-[9px] font-black uppercase text-teal-500">{ic.role}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Briefcase size={10} /> {ic.experience}</p>
                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1"><Phone size={10} /> {ic.contact}</p>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-3 space-y-12">
                        {/* Sections */}
                        <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                            <h2 className="text-2xl font-black text-slate-800 mb-8">Active Sections</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {sections.map(sec => (
                                    <div
                                        key={sec.id}
                                        onClick={() => { setActiveSectionID(sec.id); setView('SECTION'); }}
                                        className="group p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-teal-200 hover:bg-white hover:shadow-xl transition-all cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <span className="w-12 h-12 rounded-xl bg-teal-100/60 text-teal-700 flex items-center justify-center font-black text-lg">
                                                {sec.name.includes('-') ? sec.name.split('-')[1] : sec.name[0]}
                                            </span>
                                            <IconBtn icon={Trash2} variant="red" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setConfirmDelete({ type: 'SECTION', id: sec.id, name: sec.name }); }} />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800">Section {sec.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1"><UserCheck size={11} />{sec.classTeacher}</p>
                                        <div className="mt-5 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                                            <span>{store.students.filter(s => s.sectionId === sec.id).length} Students</span>
                                            <span>{1 + (sec.subjectTeachers?.length || 0)} Teachers</span>
                                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Faculty */}
                        <section>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-slate-800">Faculty Registry</h2>
                                <button onClick={() => setShowModal({ type: 'TEACHER' })} className="px-4 py-2 bg-slate-100 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-200 flex items-center gap-1">
                                    <Plus size={14} /> Add Teacher
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teachers.slice(0, 6).map(t => (
                                    <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-lg">{t.name[0]}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{t.name}</h4>
                                                <p className="text-xs font-bold text-slate-400">{t.subject} · {t.experience}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setActiveProfile(t); setView('TEACHER_PROFILE'); }}
                                                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                View Profile
                                            </button>
                                            <IconBtn icon={Trash2} variant="red" onClick={() => setConfirmDelete({ type: 'TEACHER', id: t.id, name: t.name })} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {renderModalStack()}
            </div>
        );
    }

    // ── SECTION PAGE ───────────────────────────────────────────────
    if (view === 'SECTION') {
        const students = store.students.filter(s => s.sectionId === activeSectionID);
        const subjectTeachers = activeSection?.subjectTeachers || [];

        return (
            <div className="p-10 max-w-7xl mx-auto min-h-screen">
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => setView('CATEGORY')} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                        <ArrowLeft size={20} /> Back to {activeClass?.name}
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                            onClick={() => setShowModal({ type: 'BULK_STUDENTS' })}
                            className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:border-teal-300 hover:text-teal-700 transition-all flex items-center gap-2"
                        >
                            <Upload size={18} /> Bulk Add
                        </button>
                        <button
                            onClick={() => setShowModal({ type: 'STUDENT' })}
                            className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2"
                        >
                            <Plus size={20} /> Add Student
                        </button>
                    </div>
                </div>

                {/* Section Header */}
                <div className="bg-slate-900 text-white p-12 rounded-[56px] mb-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-slate-900/20">
                    <div>
                        <span className="px-3 py-1 bg-teal-500 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-4 block w-fit">Section Registry</span>
                        <h1 className="text-6xl font-black tracking-tighter mb-4">{activeSection?.name} Enrollment</h1>
                        <div className="flex flex-wrap gap-6 text-slate-400 font-bold">
                            <span className="flex items-center gap-2"><UserCheck className="text-teal-400" size={18} /> Lead: {activeSection?.classTeacher}</span>
                            <span className="flex items-center gap-2"><Users className="text-indigo-400" size={18} /> Subject Faculty: {subjectTeachers.length}/4</span>
                            <span className="flex items-center gap-2"><Building2 className="text-blue-400" size={18} /> Room: {activeSection?.roomNumber || 'TBD'}</span>
                        </div>
                    </div>
                    <div className="w-44 h-44 rounded-[40px] bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-6xl font-black tracking-tighter leading-none">{students.length}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 mt-2">Enrolled</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm md:col-span-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-3">Class Teacher</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">{activeSection?.classTeacher?.[0] || 'U'}</div>
                            <div>
                                <p className="font-black text-slate-800 leading-tight">{activeSection?.classTeacher || 'Unassigned'}</p>
                                <p className="text-[10px] font-bold text-teal-500">Home Section</p>
                            </div>
                        </div>
                    </div>
                    {subjectTeachers.map((teacher) => (
                        <div key={`${teacher.id}-${teacher.subject}`} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-3">{teacher.subject}</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{teacher.name[0]}</div>
                                <p className="font-black text-slate-800 leading-tight">{teacher.name}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Student Rows */}
                <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Roll</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Gender</th>
                                    <th className="px-6 py-4">Parent</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s) => (
                                    <motion.tr
                                        layout
                                        key={s.id}
                                        className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-black text-slate-300">{s.rollNo}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black">
                                                    {s.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{s.name}</p>
                                                    <p className="text-xs text-slate-500">{s.email || 'No email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${s.gender === 'Male' ? 'bg-blue-50 text-blue-500' : s.gender === 'Female' ? 'bg-pink-50 text-pink-500' : 'bg-slate-100 text-slate-500'}`}>
                                                {s.gender}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{s.parentName}</td>
                                        <td className="px-6 py-4 text-slate-500">{s.contact}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setActiveProfile(s); setView('STUDENT_PROFILE'); }}
                                                    className="px-3 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                                                >
                                                    View Profile
                                                </button>
                                                <IconBtn icon={Trash2} variant="red" onClick={() => setConfirmDelete({ type: 'STUDENT', id: s.id, name: s.name })} />
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {renderModalStack()}
            </div>
        );
    }

    // ── TEACHER PROFILE ────────────────────────────────────────────
    if (view === 'TEACHER_PROFILE' && activeProfile) {
        const teacherProfile = activeProfile as ITeacher;
        return (
            <div className="p-10 max-w-5xl mx-auto min-h-screen">
                <button onClick={() => setView('CATEGORY')} className="mb-10 flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                    <ArrowLeft size={20} /> Back to Faculty Registry
                </button>
                <div className="bg-white rounded-[64px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
                    <div className="w-full md:w-2/5 bg-slate-900 p-16 text-white flex flex-col justify-between gap-12">
                        <div className="w-28 h-28 rounded-[36px] bg-teal-500 flex items-center justify-center text-5xl font-black border-4 border-white/10">
                            {teacherProfile.name[0]}
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">{teacherProfile.name}</h1>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest">{teacherProfile.subject}</span>
                                <span className="px-4 py-1.5 bg-teal-500 rounded-full text-xs font-black uppercase tracking-widest">Faculty</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-3/5 p-16">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-12">Professional Dossier</h3>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                            {[
                                { l: 'Subject Specialty', v: teacherProfile.subject, i: BookOpen },
                                { l: 'Qualification', v: teacherProfile.qualification, i: Award },
                                { l: 'Experience', v: teacherProfile.experience, i: Briefcase },
                                { l: 'Class Teacher Of', v: teacherProfile.classTeacherOf || 'Not assigned', i: UserCheck },
                                { l: 'Subject Sections', v: teacherProfile.subjectTeacherSections?.join(', ') || 'Not assigned', i: MapPin },
                                { l: 'Contact', v: teacherProfile.contact, i: Phone },
                                { l: 'System ID', v: teacherProfile.id?.slice(0, 12), i: Shield },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <item.i size={12} className="text-teal-400" />
                                        <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">{item.l}</span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-xl leading-tight">{item.v}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── STUDENT PROFILE ────────────────────────────────────────────
    if (view === 'STUDENT_PROFILE' && activeProfile) {
        const studentProfile = activeProfile as IStudent;
        return (
            <div className="p-10 max-w-5xl mx-auto min-h-screen">
                <button onClick={() => setView('SECTION')} className="mb-10 flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                    <ArrowLeft size={20} /> Back to Section
                </button>
                <div className="bg-white rounded-[64px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
                    <div className="w-full md:w-2/5 bg-teal-600 p-16 text-white flex flex-col justify-between gap-12">
                        <div className="w-28 h-28 rounded-[36px] bg-white flex items-center justify-center text-5xl font-black text-teal-600 shadow-xl">
                            {studentProfile.name[0]}
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">{studentProfile.name}</h1>
                            <span className="px-5 py-2 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">Student Enrolee</span>
                        </div>
                    </div>
                    <div className="w-full md:w-3/5 p-16">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-12">Enrollment File</h3>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                            {[
                                { l: 'Roll Number', v: studentProfile.rollNo, i: Hash },
                                { l: 'Gender', v: studentProfile.gender, i: User },
                                { l: 'Academic Class', v: activeClass?.name || studentProfile.categoryId, i: MapPin },
                                { l: 'Section', v: activeSection?.name || studentProfile.sectionId, i: Users },
                                { l: 'Date of Birth', v: studentProfile.dob, i: Calendar },
                                { l: 'Parent', v: studentProfile.parentName, i: Shield },
                                { l: 'Contact', v: studentProfile.contact, i: Phone },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <item.i size={12} className="text-teal-400" />
                                        <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">{item.l}</span>
                                    </div>
                                    <p className="font-bold text-slate-800 text-xl leading-tight">{item.v}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback (modals rendered here when no view matched yet)
    return (
        <>
            {renderModalStack()}
        </>
    );
}

// ─── Add Modal ─────────────────────────────────────────────────
function AddModal({ onClose, onSubmit, type, gradeLabel, isSubmitting = false }: { onClose: () => void; onSubmit: React.FormEventHandler<HTMLFormElement>; type: string; gradeLabel?: string; isSubmitting?: boolean }) {
    const maxDob = getTodayInputDate();

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/10" onClick={onClose}>
            <motion.div
                onClick={(event) => event.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-white rounded-[40px] shadow-2xl w-full p-10 ${type === 'BULK_STUDENTS' ? 'max-w-3xl' : 'max-w-md'}`}
            >
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add <span className="text-slate-300">{type === 'BULK_STUDENTS' ? 'STUDENTS' : type}</span></h2>
                    <button type="button" onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    {type === 'SECTION' && (
                        <>
                            <input name="name" required placeholder="Section Name (e.g. 1-B)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="teacher" required placeholder="Assigned Class Teacher" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="strength" type="number" placeholder="Strength (e.g. 20)" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="room" placeholder="Room No (optional)" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                        </>
                    )}
                    {type === 'TEACHER' && (
                        <>
                            <input name="name" required placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="email" type="email" required placeholder="Teacher Login Email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="subject" required placeholder="Subject" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="qual" required placeholder="Qualification" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input name="exp" required placeholder="Experience (yrs)" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="phone" required placeholder="Phone Number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Login Password" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="Confirm Password" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                        </>
                    )}
                    {type === 'STUDENT' && (
                        <>
                            <input name="name" required placeholder="Student Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="email" type="email" required placeholder="Student Login Email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="roll" required placeholder="Roll Number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <select name="gender" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <input name="dob" type="date" max={maxDob} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="parent" required placeholder="Parent / Guardian Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="phone" required placeholder="Contact Number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Login Password" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="Confirm Password" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                        </>
                    )}
                    {type === 'BULK_STUDENTS' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">CSV or spreadsheet rows</p>
                                <p className="mt-1 text-xs font-bold text-teal-900">
                                    name, email, roll no, gender, dob, contact, parent name, parent contact, address
                                </p>
                            </div>
                            <textarea
                                name="students"
                                required
                                rows={10}
                                placeholder={'Rahul Sharma, rahul@school.edu, 101, Male, 2012-04-18, 9876543210, Amit Sharma, 9876543210, New Delhi\nPriya Singh, priya@school.edu, 102, Female, 2012-07-09, 9876543211, Neha Singh, 9876543211, New Delhi'}
                                className="w-full resize-y rounded-2xl border border-slate-100 bg-slate-50 p-4 font-mono text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    )}
                    {type === 'SUBJECT' && (
                        <>
                            <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{gradeLabel}</p>
                                <p className="mt-1 text-xs font-bold text-teal-900">The subject will apply to every section in this class.</p>
                            </div>
                            <input
                                name="subject"
                                required
                                autoFocus
                                placeholder="Subject name (e.g. Music)"
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                        </>
                    )}
                    <button disabled={isSubmitting} type="submit" className="w-full py-5 bg-teal-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-teal-500/20 hover:bg-teal-700 transition-all uppercase tracking-widest mt-2 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {isSubmitting ? 'Saving...' : type === 'BULK_STUDENTS' ? 'Import Students' : type === 'SUBJECT' ? 'Add Subject' : 'Confirm Registration'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Delete Confirm ────────────────────────────────────────────
function DeleteConfirm({ item, onCancel, onConfirm }: { item: DeleteState; onCancel: () => void; onConfirm: () => void }) {
    const [isFinalTeacherStep, setIsFinalTeacherStep] = useState(false);
    const isTeacherDelete = item.type === 'TEACHER';
    const isSubjectDelete = item.type === 'SUBJECT';

    return (
        <div className={`fixed inset-0 z-[160] flex items-center justify-center p-6 backdrop-blur-md ${isTeacherDelete ? 'bg-sky-100/80' : 'bg-rose-900/10'}`} onClick={onCancel}>
            <motion.div
                onClick={(event) => event.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={`bg-white shadow-2xl w-full max-w-sm text-center ${isTeacherDelete ? 'rounded-xl border border-slate-200 px-8 py-7' : 'rounded-[40px] p-12'}`}
            >
                <div className={`${isTeacherDelete ? 'h-10 w-10 mb-4' : 'w-20 h-20 mb-8'} bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto`}>
                    <AlertTriangle size={isTeacherDelete ? 22 : 36} />
                </div>
                <h3 className={`${isTeacherDelete ? 'text-lg' : 'text-3xl'} font-black text-slate-900 mb-3`}>
                    {isTeacherDelete ? (isFinalTeacherStep ? 'Final confirmation' : 'Are you sure?') : isSubjectDelete ? 'Delete Subject?' : 'Delete Permanently?'}
                </h3>
                <p className={`${isTeacherDelete ? 'mx-auto max-w-xs text-sm leading-6' : ''} text-slate-500 font-medium mb-10`}>
                    {isTeacherDelete
                        ? isFinalTeacherStep
                            ? <>Deleting <span className="font-bold text-rose-600">{item.name}</span> will remove this faculty record and its linked staffing references.</>
                            : 'This action cannot be undone. All values associated with this teacher will be lost.'
                        : isSubjectDelete
                            ? <>Are you sure you want to delete <span className="font-bold text-rose-600">{item.name}</span> from all {item.gradeLabel} sections?</>
                        : <>You are removing <span className="font-bold text-rose-600">{item.name}</span>. This cannot be undone.</>}
                </p>
                <div className={isTeacherDelete ? 'space-y-3' : 'flex gap-4'}>
                    {isTeacherDelete ? (
                        <>
                            <button
                                type="button"
                                onClick={() => (isFinalTeacherStep ? onConfirm() : setIsFinalTeacherStep(true))}
                                className="w-full rounded-md bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-rose-700"
                            >
                                {isFinalTeacherStep ? 'Yes, delete teacher' : 'Delete teacher'}
                            </button>
                            <button type="button" onClick={onCancel} className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50">Cancel</button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100">Cancel</button>
                            <button type="button" onClick={onConfirm} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-600">Delete</button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
