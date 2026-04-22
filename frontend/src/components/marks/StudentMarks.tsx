import { useState } from 'react';
import { EXAM_TYPES, useMarksStore } from '../../store/useMarksStore';
import { useAuthStore } from '../../store/useAuthStore';
import { TrendingUp, BookOpen, Award, BarChart3, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ExamType } from '../../store/useMarksStore';

const StudentMarks = () => {
  const { user } = useAuthStore();
  const { marks } = useMarksStore();
  const [selectedExam, setSelectedExam] = useState<ExamType>('Unit Test');

  const myMarks = marks.filter(m => m.studentId === user?.id);
  const examMarks = myMarks.filter(m => m.examType === selectedExam);

  const stats = [
    { title: 'Average Score', value: examMarks.length ? (examMarks.reduce((acc, curr) => acc + curr.marks, 0) / examMarks.length).toFixed(1) + '%' : 'N/A', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Top Grade', value: examMarks.length ? Math.max(...examMarks.map(m => m.marks)) + '%' : 'N/A', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Subjects', value: examMarks.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academic Progress</h2>
          <p className="text-slate-500 text-sm">View your exam results and performance analytics</p>
        </div>
        
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          {EXAM_TYPES.map(type => (
            <button 
              key={type}
              onClick={() => setSelectedExam(type)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedExam === type 
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" size={20} />
            Subject Performance
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examMarks}>
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="marks" radius={[8, 8, 8, 8]} barSize={40}>
                  {examMarks.map((entry, index) => (
                    <Cell key={index} fill={entry.marks >= 75 ? '#10b981' : entry.marks >= 40 ? '#6366f1' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Subject Breakdown</h3>
          <div className="space-y-4">
            {examMarks.map((mark, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm text-indigo-600">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{mark.subject}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Max: {mark.maxMarks}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-black ${mark.marks >= 75 ? 'text-emerald-600' : mark.marks >= 40 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {mark.marks}%
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            ))}
            {examMarks.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-medium italic">
                No marks data available for this exam type.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMarks;
