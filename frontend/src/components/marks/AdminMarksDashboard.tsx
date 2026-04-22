import { useState } from 'react';
import { EXAM_TYPES, useMarksStore } from '../../store/useMarksStore';
import type { ExamType } from '../../store/useMarksStore';
import { Search, FileText, GraduationCap, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminMarksDashboard = () => {
  const { marks } = useMarksStore();
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedExam, setSelectedExam] = useState<ExamType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarks = marks.filter(m => {
    const matchesClass = selectedClass === 'All' || m.class === selectedClass;
    const matchesExam = selectedExam === 'All' || m.examType === selectedExam;
    const matchesSearch = m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesExam && matchesSearch;
  });

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Performance Report - institutional Marks', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filters: Class ${selectedClass}, Exam: ${selectedExam}`, 14, 30);
    
    const tableData = filteredMarks.map(m => [m.studentName, m.class, m.subject, m.examType, `${m.marks}/${m.maxMarks}`]);
    autoTable(doc, {
      head: [['Student', 'Class', 'Subject', 'Exam', 'Marks']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save('marks_report.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">Marks Dashboard</h2>
          <p className="text-slate-500 text-sm">Comprehensive overview of institution-wide academic performance</p>
        </div>
        
        <button 
          onClick={generateReport}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <FileText size={18} className="text-indigo-600" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search student or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <select 
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="All">All Classes</option>
            <option value="10-A">Class 10-A</option>
            <option value="10-B">Class 10-B</option>
            <option value="10-C">Class 10-C</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
        <div className="relative">
          <select 
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value as any)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer font-medium"
          >
            <option value="All">All Exams</option>
            {EXAM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Student</th>
              <th className="px-8 py-5">Class</th>
              <th className="px-8 py-5">Subject</th>
              <th className="px-8 py-5">Exam Type</th>
              <th className="px-8 py-5 text-right">Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMarks.map((mark) => (
              <tr key={mark.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-slate-100 shadow-sm">
                      {mark.studentName.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{mark.studentName}</span>
                  </div>
                </td>
                <td className="px-8 py-5 font-bold text-slate-500 text-sm">{mark.class}</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider">
                    {mark.subject}
                  </span>
                </td>
                <td className="px-8 py-5 font-medium text-slate-600">{mark.examType}</td>
                <td className="px-8 py-5 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-base font-black ${mark.marks >= 75 ? 'text-emerald-600' : 'text-slate-900'}`}>{mark.marks}</span>
                    <span className="text-[10px] font-bold text-slate-300">OUT OF {mark.maxMarks}</span>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMarks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap size={48} className="text-slate-100" />
                    <p className="text-slate-400 font-medium">No Grade reports matching your search</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMarksDashboard;
