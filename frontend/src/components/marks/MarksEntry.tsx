import { useState } from 'react';
import { EXAM_TYPES, useMarksStore } from '../../store/useMarksStore';
import type { ExamType } from '../../store/useMarksStore';
import { mockStudents } from '../../mock-data';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, CheckCircle, AlertCircle, Users, BookOpen, GraduationCap } from 'lucide-react';

const MarksEntry = () => {
  const { user } = useAuthStore();
  const { addMark, marks, updateMark } = useMarksStore();
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [selectedSubject] = useState(user?.subject || 'Mathematics');
  const [examType, setExamType] = useState<ExamType>('Unit Test');
  const [notification, setNotification] = useState<string | null>(null);

  const students = mockStudents.filter(s => s.class === selectedClass);

  const handleSaveMarks = (studentId: string, studentName: string, value: string) => {
    const markValue = parseInt(value);
    if (isNaN(markValue) || markValue < 0 || markValue > 100) return;

    const existingMark = marks.find(m => 
      m.studentId === studentId && 
      m.subject === selectedSubject && 
      m.examType === examType
    );

    if (existingMark) {
      updateMark(existingMark.id, { marks: markValue });
    } else {
      addMark({
        studentId,
        studentName,
        class: selectedClass,
        subject: selectedSubject,
        marks: markValue,
        maxMarks: 100,
        examType,
        teacherId: user?.id || 'unknown'
      });
    }

    setNotification(`Marks updated for ${studentName}`);
    setTimeout(() => setNotification(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marks Entry</h2>
          <p className="text-slate-500 text-sm">Update and manage student grades for your subjects</p>
        </div>
        
        {notification && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <CheckCircle size={16} />
            <span className="text-sm font-bold">{notification}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={14} /> Select Class
          </label>
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50/50"
          >
            <option value="10-A">Class 10-A</option>
            <option value="10-B">Class 10-B</option>
            <option value="10-C">Class 10-C</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={14} /> Subject
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold block">
            {selectedSubject}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap size={14} /> Exam Type
          </label>
          <select 
            value={examType}
            onChange={e => setExamType(e.target.value as ExamType)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50/50"
          >
            {EXAM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
           <button className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
             <Search size={18} /> Load Students
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-8 py-4">Student Name</th>
              <th className="px-8 py-4">Roll No</th>
              <th className="px-8 py-4">Marks Obtained (Max 100)</th>
              <th className="px-8 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map(student => {
              const markRecord = marks.find(m => 
                m.studentId === student.id && 
                m.subject === selectedSubject && 
                m.examType === examType
              );
              
              return (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                        {student.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-slate-500 font-medium">#{student.id.replace('s', '')}</td>
                  <td className="px-8 py-4">
                    <div className="relative max-w-[120px]">
                      <input 
                        type="number"
                        defaultValue={markRecord?.marks || ''}
                        onBlur={(e) => handleSaveMarks(student.id, student.name, e.target.value)}
                        className="w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900"
                        placeholder="00"
                        min="0"
                        max="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">/ 100</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-center">
                    {markRecord ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle size={10} /> Saved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={10} /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarksEntry;
