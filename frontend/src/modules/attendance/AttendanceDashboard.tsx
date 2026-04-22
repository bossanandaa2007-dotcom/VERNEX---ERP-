import { useState } from 'react';
import { Users, AlertTriangle, CalendarDays, CheckCircle2, XCircle, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import { mockStudents, mockGranularAttendance } from '../../mock-data';
import { useAuthStore } from '../../store/useAuthStore';

const AttendanceDashboard = () => {
  const { user } = useAuthStore();
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // mock local state for attendance mapping
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>(
    mockStudents.reduce((acc, student) => ({ ...acc, [student.id]: 'Present' }), {})
  );

  const handleMark = (id: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [id]: status }));
  };

  const handleBulk = (status: string) => {
    const updated = mockStudents.reduce((acc, student) => ({ ...acc, [student.id]: status }), {});
    setAttendanceData(updated);
  };

  const submitAttendance = () => {
    alert(`Attendance marked successfully for ${selectedClass} on ${attendanceDate}! Detailed subject logs updated.`);
  };

  if (user?.role === 'Student') {
    return (
      <div className="space-y-6 lg:pb-12 h-full">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Academic Presence</h1>
            <p className="text-slate-500 mt-1">Detailed subject-wise attendance analytics for the current month.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 shadow-sm">
             <TrendingUp size={16} /> 94.2% Monthly Average
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg"><BookOpen size={24} /></div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Subjects Covered</p>
                 <p className="text-2xl font-bold text-slate-900">5 Courses</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-lg"><CheckCircle2 size={24} /></div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Days Attended</p>
                 <p className="text-2xl font-bold text-slate-900">22 Days</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-rose-500 text-white rounded-xl shadow-lg"><XCircle size={24} /></div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Leaves/Absence</p>
                 <p className="text-2xl font-bold text-slate-900">2 Sessions</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-4 bg-blue-500 text-white rounded-xl shadow-lg"><GraduationCap size={24} /></div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Average</p>
                 <p className="text-2xl font-bold text-slate-900">94.2%</p>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Subject-wise Breakdown</h3>
              <select className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none">
                 <option>All Subjects</option>
              </select>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-slate-50/80 uppercase text-slate-500 text-xs font-bold tracking-widest">
                    <tr>
                       <th className="px-6 py-4 border-b border-slate-100">Academic Subject</th>
                       <th className="px-6 py-4 border-b border-slate-100">Sessions Attended</th>
                       <th className="px-6 py-4 border-b border-slate-100 text-center">Progress Status</th>
                       <th className="px-6 py-4 border-b border-slate-100 text-right">Attendance %</th>
                    </tr>
                 </thead>
                 <tbody>
                    {mockGranularAttendance.map((item, i) => {
                       const percentage = Math.round((item.present / item.total) * 100);
                       return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                             <td className="px-6 py-4 font-bold text-slate-900">{item.subject}</td>
                             <td className="px-6 py-4 font-medium text-slate-600">
                                <span className="text-emerald-600 font-bold">{item.present}</span> / {item.total} Classes
                             </td>
                             <td className="px-6 py-4">
                                <div className="max-w-[120px] mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                                   <div 
                                      className={`h-full ${percentage >= 85 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                      style={{ width: `${percentage}%` }} 
                                   />
                                </div>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <span className={`font-extrabold text-sm ${percentage >= 85 ? 'text-emerald-600' : percentage >= 75 ? 'text-amber-500' : 'text-rose-600'}`}>
                                   {percentage}%
                                </span>
                             </td>
                          </tr>
                       )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-slate-500 mt-1">Mark and monitor daily attendance patterns.</p>
        </div>
        {(user?.role === 'Admin' || user?.role === 'Teacher') && (
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">Daily View</button>
            <button className="px-4 py-1.5 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Monthly Report</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Overall Present Today', value: '94%', icon: Users, color: 'bg-emerald-500' },
          { title: 'Absent Alert', value: '12 Students', icon: AlertTriangle, color: 'bg-amber-500' },
          { title: 'Working Days', value: '24', icon: CalendarDays, color: 'bg-blue-500' },
        ].map((stat, i) => (
           <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
             <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                <stat.icon size={24} />
              </div>
            <div>
              <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-12">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              {user?.classes?.map(c => <option key={c} value={c}>Class {c}</option>) || <option value="10-A">Class 10-A</option>}
              <option value="9-B">Class 9-B</option>
            </select>
            <input 
              type="date" 
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => handleBulk('Present')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
              Mark All Present
            </button>
            <button onClick={() => handleBulk('Absent')} className="flex-1 sm:flex-none px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium hover:bg-rose-100 transition-colors">
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 uppercase text-slate-500 text-xs font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100">Roll No</th>
                <th className="px-6 py-4 border-b border-slate-100">Student Info</th>
                <th className="px-6 py-4 border-b border-slate-100">Contact</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockStudents.filter(s => s.class === selectedClass).map((student, i) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                  <td className="px-6 py-4 font-medium text-slate-500">{i + 1}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{student.name}</span>
                          <span className="text-xs text-slate-500">Sec: {student.section}</span>
                        </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{student.email}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm font-medium text-nowrap">
                      <button 
                        onClick={() => handleMark(student.id, 'Present')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                          attendanceData[student.id] === 'Present' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 size={16} className={attendanceData[student.id] === 'Present' ? 'text-emerald-600' : ''} />
                        Present
                      </button>
                      <button 
                         onClick={() => handleMark(student.id, 'Absent')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                          attendanceData[student.id] === 'Absent' 
                          ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <XCircle size={16} className={attendanceData[student.id] === 'Absent' ? 'text-rose-600' : ''} />
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {mockStudents.filter(s => s.class === selectedClass).length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold">No records found for the selected module.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
           <button onClick={submitAttendance} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
             Submit Attendance Log
           </button>
        </div>
      </div>
    </div>
  );
};
export default AttendanceDashboard;
