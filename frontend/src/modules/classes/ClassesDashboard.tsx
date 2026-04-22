import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Baby, BookOpen, GraduationCap, Building2,
    Plus, Trash2, ChevronRight, ArrowLeft,
    User, Shield, Users, Phone, Award,
    Briefcase, X, CheckCircle2, UserCheck,
    Calendar, AlertTriangle, MapPin, Hash
} from 'lucide-react';
import { useClassStore } from '../../store/useClassStore';

// ─── Shared Mini Components ────────────────────────────────────
const IconBtn = ({ icon: Icon, onClick, variant = 'gray' }: any) => {
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
export default function ClassesDashboard() {
    const store = useClassStore();

    const [view, setView] = useState<'DASHBOARD' | 'CATEGORY' | 'SECTION' | 'TEACHER_PROFILE' | 'STUDENT_PROFILE'>('DASHBOARD');
    const [activeCategoryID, setActiveCategoryID] = useState<string | null>(null);
    const [activeSectionID, setActiveSectionID] = useState<string | null>(null);
    const [activeProfile, setActiveProfile] = useState<any>(null);
    const [showModal, setShowModal] = useState<any>(null); // { type: 'SECTION' | 'TEACHER' | 'STUDENT' }
    const [confirmDelete, setConfirmDelete] = useState<any>(null); // { type, id, name }
    const [toast, setToast] = useState<string | null>(null);

    const activeClass = store.categories.find(c => c.id === activeCategoryID);
    const activeSection = store.sections.find(s => s.id === activeSectionID);

    const notify = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = () => {
        if (!confirmDelete) return;
        if (confirmDelete.type === 'SECTION') store.deleteSection(confirmDelete.id);
        if (confirmDelete.type === 'TEACHER') store.deleteTeacher(confirmDelete.id);
        if (confirmDelete.type === 'STUDENT') store.deleteStudent(confirmDelete.id);
        setConfirmDelete(null);
        notify('Entry removed from registry.');
    };

    const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const get = (k: string) => fd.get(k) as string;

        if (showModal?.type === 'SECTION') {
            store.addSection({
                name: get('name'), categoryId: activeCategoryID!,
                classTeacher: get('teacher'), strength: parseInt(get('strength')) || 20,
                roomNumber: get('room') || undefined,
            });
            notify('Section added successfully.');
        } else if (showModal?.type === 'TEACHER') {
            store.addTeacher({
                name: get('name'), subject: get('subject'), category: activeCategoryID!,
                qualification: get('qual'), experience: get('exp'),
                contact: get('phone'), email: '', assignedClass: activeClass?.name || '',
            });
            notify('Teacher registered successfully.');
        } else if (showModal?.type === 'STUDENT') {
            store.addStudent({
                name: get('name'), rollNo: get('roll'), categoryId: activeCategoryID!,
                sectionId: activeSectionID!, gender: get('gender') as any,
                dob: get('dob'), contact: get('phone'),
                parentName: get('parent'), parentContact: '', address: 'New Delhi',
            });
            notify('Student admitted successfully.');
        }
        setShowModal(null);
    };

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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {store.categories.map((cat: any) => {
                        const Icon = ({ Baby, BookOpen, GraduationCap, Building2 } as any)[cat.icon] || BookOpen;
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

                <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast(null)} />}</AnimatePresence>
            </div>
        );
    }

    // ── CATEGORY PAGE ──────────────────────────────────────────────
    if (view === 'CATEGORY') {
        const teachers = store.teachers.filter(t => t.category === activeCategoryID);
        const sections = store.sections.filter(s => s.categoryId === activeCategoryID);
        const inCharges = (store.inCharges as any)[activeCategoryID!] || [];

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
                            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:border-teal-300 hover:shadow-md transition-all"
                        >
                            Add Section
                        </button>
                        <button
                            onClick={() => setShowModal({ type: 'TEACHER' })}
                            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> New Faculty
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
                        {inCharges.map((ic: any, i: number) => (
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

                {/* Modals */}
                <AnimatePresence>
                    {showModal && <AddModal onClose={() => setShowModal(null)} onSubmit={handleAdd} type={showModal.type} />}
                    {confirmDelete && <DeleteConfirm item={confirmDelete} onCancel={() => setConfirmDelete(null)} onConfirm={handleDelete} />}
                </AnimatePresence>
                <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast(null)} />}</AnimatePresence>
            </div>
        );
    }

    // ── SECTION PAGE ───────────────────────────────────────────────
    if (view === 'SECTION') {
        const students = store.students.filter(s => s.sectionId === activeSectionID);

        return (
            <div className="p-10 max-w-7xl mx-auto min-h-screen">
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => setView('CATEGORY')} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                        <ArrowLeft size={20} /> Back to {activeClass?.name}
                    </button>
                    <button
                        onClick={() => setShowModal({ type: 'STUDENT' })}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Add Student
                    </button>
                </div>

                {/* Section Header */}
                <div className="bg-slate-900 text-white p-12 rounded-[56px] mb-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-slate-900/20">
                    <div>
                        <span className="px-3 py-1 bg-teal-500 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] mb-4 block w-fit">Section Registry</span>
                        <h1 className="text-6xl font-black tracking-tighter mb-4">{activeSection?.name} Enrollment</h1>
                        <div className="flex flex-wrap gap-6 text-slate-400 font-bold">
                            <span className="flex items-center gap-2"><UserCheck className="text-teal-400" size={18} /> Lead: {activeSection?.classTeacher}</span>
                            <span className="flex items-center gap-2"><Building2 className="text-blue-400" size={18} /> Room: {activeSection?.roomNumber || 'TBD'}</span>
                        </div>
                    </div>
                    <div className="w-44 h-44 rounded-[40px] bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-6xl font-black tracking-tighter leading-none">{students.length}</span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-teal-400 mt-2">Enrolled</span>
                    </div>
                </div>

                {/* Student Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {students.map(s => (
                        <motion.div
                            layout key={s.id}
                            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-teal-500/10 transition-all"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-3xl text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                                    {s.rollNo}
                                </div>
                                <IconBtn icon={Trash2} variant="red" onClick={() => setConfirmDelete({ type: 'STUDENT', id: s.id, name: s.name })} />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-1">{s.name}</h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest mb-6 inline-block ${s.gender === 'Male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                                {s.gender}
                            </span>
                            <button
                                onClick={() => { setActiveProfile(s); setView('STUDENT_PROFILE'); }}
                                className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-slate-900 hover:text-white transition-all mt-2"
                            >
                                View Profile
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Modals */}
                <AnimatePresence>
                    {showModal && <AddModal onClose={() => setShowModal(null)} onSubmit={handleAdd} type={showModal.type} />}
                    {confirmDelete && <DeleteConfirm item={confirmDelete} onCancel={() => setConfirmDelete(null)} onConfirm={handleDelete} />}
                </AnimatePresence>
                <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast(null)} />}</AnimatePresence>
            </div>
        );
    }

    // ── TEACHER PROFILE ────────────────────────────────────────────
    if (view === 'TEACHER_PROFILE' && activeProfile) {
        return (
            <div className="p-10 max-w-5xl mx-auto min-h-screen">
                <button onClick={() => setView('CATEGORY')} className="mb-10 flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                    <ArrowLeft size={20} /> Back to Faculty Registry
                </button>
                <div className="bg-white rounded-[64px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
                    <div className="w-full md:w-2/5 bg-slate-900 p-16 text-white flex flex-col justify-between gap-12">
                        <div className="w-28 h-28 rounded-[36px] bg-teal-500 flex items-center justify-center text-5xl font-black border-4 border-white/10">
                            {activeProfile.name[0]}
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">{activeProfile.name}</h1>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest">{activeProfile.subject}</span>
                                <span className="px-4 py-1.5 bg-teal-500 rounded-full text-xs font-black uppercase tracking-widest">Faculty</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-3/5 p-16">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-12">Professional Dossier</h3>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                            {[
                                { l: 'Subject Specialty', v: activeProfile.subject, i: BookOpen },
                                { l: 'Qualification', v: activeProfile.qualification, i: Award },
                                { l: 'Experience', v: activeProfile.experience, i: Briefcase },
                                { l: 'Assigned Class', v: activeProfile.assignedClass || activeClass?.name, i: MapPin },
                                { l: 'Contact', v: activeProfile.contact, i: Phone },
                                { l: 'System ID', v: activeProfile.id?.slice(0, 12), i: Shield },
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
        return (
            <div className="p-10 max-w-5xl mx-auto min-h-screen">
                <button onClick={() => setView('SECTION')} className="mb-10 flex items-center gap-2 text-slate-400 font-bold hover:text-slate-900 transition-colors">
                    <ArrowLeft size={20} /> Back to Section
                </button>
                <div className="bg-white rounded-[64px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
                    <div className="w-full md:w-2/5 bg-teal-600 p-16 text-white flex flex-col justify-between gap-12">
                        <div className="w-28 h-28 rounded-[36px] bg-white flex items-center justify-center text-5xl font-black text-teal-600 shadow-xl">
                            {activeProfile.name[0]}
                        </div>
                        <div>
                            <h1 className="text-5xl font-black tracking-tighter leading-none mb-4">{activeProfile.name}</h1>
                            <span className="px-5 py-2 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">Student Enrolee</span>
                        </div>
                    </div>
                    <div className="w-full md:w-3/5 p-16">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-12">Enrollment File</h3>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-10">
                            {[
                                { l: 'Roll Number', v: activeProfile.rollNo, i: Hash },
                                { l: 'Gender', v: activeProfile.gender, i: User },
                                { l: 'Academic Class', v: activeClass?.name || activeProfile.categoryId, i: MapPin },
                                { l: 'Section', v: activeSection?.name || activeProfile.sectionId, i: Users },
                                { l: 'Date of Birth', v: activeProfile.dob, i: Calendar },
                                { l: 'Parent', v: activeProfile.parentName, i: Shield },
                                { l: 'Contact', v: activeProfile.contact, i: Phone },
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
            <AnimatePresence>
                {showModal && <AddModal onClose={() => setShowModal(null)} onSubmit={handleAdd} type={showModal.type} />}
                {confirmDelete && <DeleteConfirm item={confirmDelete} onCancel={() => setConfirmDelete(null)} onConfirm={handleDelete} />}
            </AnimatePresence>
            <AnimatePresence>{toast && <Toast msg={toast} onClose={() => setToast(null)} />}</AnimatePresence>
        </>
    );
}

// ─── Add Modal ─────────────────────────────────────────────────
function AddModal({ onClose, onSubmit, type }: { onClose: () => void; onSubmit: any; type: string }) {
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/10">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10"
            >
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Add <span className="text-slate-300">{type}</span></h2>
                    <button onClick={onClose} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100">
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
                            <div className="grid grid-cols-2 gap-3">
                                <input name="subject" required placeholder="Subject" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="qual" required placeholder="Qualification" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input name="exp" required placeholder="Experience (yrs)" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <input name="phone" required placeholder="Phone Number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            </div>
                        </>
                    )}
                    {type === 'STUDENT' && (
                        <>
                            <input name="name" required placeholder="Student Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <input name="roll" required placeholder="Roll Number" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                                <select name="gender" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <input name="dob" type="date" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="parent" required placeholder="Parent / Guardian Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                            <input name="phone" required placeholder="Contact Number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" />
                        </>
                    )}
                    <button type="submit" className="w-full py-5 bg-teal-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-teal-500/20 hover:bg-teal-700 transition-all uppercase tracking-widest mt-2">
                        Confirm Registration
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Delete Confirm ────────────────────────────────────────────
function DeleteConfirm({ item, onCancel, onConfirm }: { item: any; onCancel: () => void; onConfirm: () => void }) {
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 backdrop-blur-md bg-rose-900/10">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-12 text-center"
            >
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
                    <AlertTriangle size={36} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-3">Delete Permanently?</h3>
                <p className="text-slate-500 font-medium mb-10">
                    You are removing <span className="font-bold text-rose-600">{item.name}</span>. This cannot be undone.
                </p>
                <div className="flex gap-4">
                    <button onClick={onCancel} className="flex-1 py-4 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-600">Delete</button>
                </div>
            </motion.div>
        </div>
    );
}
