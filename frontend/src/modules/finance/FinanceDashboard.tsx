import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, IndianRupee, Activity, Plus, CheckCircle, Download, CreditCard, Clock, Baby, BookOpen, GraduationCap, ChevronRight, MapPin, Shield } from 'lucide-react';
import { mockFees } from '../../mock-data';
import { useAuthStore } from '../../store/useAuthStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchLevels, fetchClasses, fetchSections, fetchStudents } from './financeApi';
import type { FinanceLevel, FinanceClass, FinanceSection, FinanceStudent } from './financeApi';
import { formatCurrency } from '../../utils/formatCurrency';

type AccountantView = 'levels' | 'classes' | 'sections' | 'students';

const levelIconMap = {
  Kindergarten: Baby,
  Primary: BookOpen,
  Secondary: GraduationCap,
  'Higher Secondary': Building2,
} as const;

const getStudentFeeStatus = (student: FinanceStudent) =>
  student.amountPaid >= student.termFees ? 'PAID' : 'PENDING';

const FinanceDashboard = () => {
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<string | null>(null);
  const [accountantView, setAccountantView] = useState<AccountantView>('levels');
  const [levels, setLevels] = useState<FinanceLevel[]>([]);
  const [classes, setClasses] = useState<FinanceClass[]>([]);
  const [sections, setSections] = useState<FinanceSection[]>([]);
  const [students, setStudents] = useState<FinanceStudent[]>([]);
  const [activeLevel, setActiveLevel] = useState<FinanceLevel | null>(null);
  const [activeClass, setActiveClass] = useState<FinanceClass | null>(null);
  const [activeSection, setActiveSection] = useState<FinanceSection | null>(null);

  const displayFees = user?.role === 'Student' 
    ? mockFees.filter(f => f.studentEmail === user.email)
    : mockFees;
  const isAccountant = user?.role === 'Accountant';

  useEffect(() => {
    if (!isAccountant) return;

    fetchLevels().then(setLevels);
  }, [isAccountant]);

  const handleCollectFee = () => {
    setNotification('Successfully collected fee for invoice #INV-7281');
    setTimeout(() => setNotification(null), 3000);
  };

  const openLevel = async (level: FinanceLevel) => {
    setActiveLevel(level);
    setActiveClass(null);
    setActiveSection(null);
    setClasses(await fetchClasses(level.id));
    setAccountantView('classes');
  };

  const openClass = async (financeClass: FinanceClass) => {
    setActiveClass(financeClass);
    setActiveSection(null);
    setSections(await fetchSections(financeClass.id));
    setAccountantView('sections');
  };

  const openSection = async (section: FinanceSection) => {
    setActiveSection(section);
    setStudents(await fetchStudents(section.id));
    setAccountantView('students');
  };

  const handleBack = () => {
    if (accountantView === 'students') {
      setActiveSection(null);
      setStudents([]);
      setAccountantView('sections');
      return;
    }

    if (accountantView === 'sections') {
      setActiveClass(null);
      setSections([]);
      setAccountantView('classes');
      return;
    }

    setActiveLevel(null);
    setClasses([]);
    setAccountantView('levels');
  };

  const handleDownloadBill = (fee: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(24);
    doc.text('EduSync ERP - Fee Receipt', 14, 25);
    
    doc.setTextColor(50);
    doc.setFontSize(12);
    doc.text(`Receipt ID: ${fee.id.toUpperCase()}`, 14, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 58);
    doc.text(`Student: ${user?.name || fee.studentEmail}`, 14, 66);
    doc.text(`Status: ${fee.status}`, 14, 74);

    // Fee Breakdown Table
    const breakdown = [
      ['Tuition Fees', formatCurrency((fee.totalAmount * 0.7).toFixed(2))],
      ['Library & Lab Fees', formatCurrency((fee.totalAmount * 0.15).toFixed(2))],
      ['Van & Transport Fees', formatCurrency((fee.totalAmount * 0.1).toFixed(2))],
      ['Extracurricular Activities', formatCurrency((fee.totalAmount * 0.05).toFixed(2))],
    ];

    autoTable(doc, {
      head: [['Fee Description', 'Amount']],
      body: breakdown,
      startY: 85,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      foot: [['Total Amount', formatCurrency(fee.totalAmount.toFixed(2))]],
      footStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text('This is a computer generated receipt and does not require a physical signature.', 14, finalY + 20);
    doc.text('Thank you for your payment!', 14, finalY + 28);

    doc.save(`Fee_Receipt_${fee.type}.pdf`);
    setNotification('Bill downloaded successfully!');
    setTimeout(() => setNotification(null), 3000);
  };

  if (isAccountant) {
    return (
      <div className="space-y-6 lg:pb-12 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accountant Fee Registry</h1>
            <p className="text-slate-500 mt-1">
              Track student fee status by academic level, class, and section.
            </p>
          </div>

          {accountantView !== 'levels' && (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm text-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Academic Levels', value: levels.length || 4, icon: Building2, color: 'bg-indigo-500' },
            { title: 'Pending Accounts', value: students.filter((student) => getStudentFeeStatus(student) === 'PENDING').length || 'Live', icon: Clock, color: 'bg-rose-500' },
            { title: 'Fee Status', value: accountantView === 'students' ? `${students.length} Students` : 'Directory', icon: IndianRupee, color: 'bg-emerald-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                <stat.icon size={24} />
              </div>
              <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mb-1">{stat.title}</h3>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {accountantView === 'levels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {levels.map((level) => {
              const Icon = levelIconMap[level.name as keyof typeof levelIconMap] || Building2;

              return (
                <button
                  key={level.id}
                  onClick={() => void openLevel(level)}
                  className="text-left bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon size={24} />
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{level.name}</h2>
                  <p className="text-slate-500 text-sm mt-2">{level.classCount} classes</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">{level.studentCount} students</p>
                </button>
              );
            })}
          </div>
        )}

        {accountantView === 'classes' && activeLevel && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{activeLevel.name}</h2>
              <p className="text-slate-500 text-sm mt-1">Select a class to view its sections.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {classes.map((financeClass) => (
                <button
                  key={financeClass.id}
                  onClick={() => void openClass(financeClass)}
                  className="text-left bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg">
                      {financeClass.name}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">Class {financeClass.name}</h3>
                  <p className="text-slate-500 text-sm mt-2">{financeClass.sectionCount} sections</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">{financeClass.studentCount} students</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {accountantView === 'sections' && activeClass && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Class {activeClass.name}</h2>
              <p className="text-slate-500 text-sm mt-1">Select a section to inspect student fee status.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => void openSection(section)}
                  className="text-left bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                      {section.name}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">Section {section.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                    <Shield size={14} className="text-blue-500" /> {section.classTeacher}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                    <MapPin size={14} className="text-blue-500" /> {section.roomNumber || 'Room TBD'}
                  </p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">{section.studentCount} students</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {accountantView === 'students' && activeSection && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Section {activeSection.name}</h2>
              <p className="text-slate-500 text-sm mt-1">Student fee status overview for this section.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 sticky top-0 z-10 uppercase text-slate-500 text-[10px] font-bold tracking-widest">
                    <tr>
                      <th className="px-5 py-4 border-b border-slate-100">Student Name</th>
                      <th className="px-5 py-4 border-b border-slate-100">Roll No</th>
                      <th className="px-5 py-4 border-b border-slate-100">Term Fees</th>
                      <th className="px-5 py-4 border-b border-slate-100">Amount Paid</th>
                      <th className="px-5 py-4 border-b border-slate-100">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const status = getStudentFeeStatus(student);

                      return (
                        <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-semibold text-slate-900">{student.name}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{student.rollNo}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(student.termFees.toLocaleString('en-IN'))}</td>
                          <td className="px-5 py-4 font-semibold text-slate-900">{formatCurrency(student.amountPaid.toLocaleString('en-IN'))}</td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                              status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Records</h1>
          <p className="text-slate-500 mt-1">
            {user?.role === 'Student' 
              ? 'View your personal fee statements and download payment receipts.' 
              : 'Track institutional revenue and monitor student payment statuses.'}
          </p>
        </div>
        {user?.role !== 'Student' && (
          <button 
            onClick={handleCollectFee}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm text-sm active:scale-95"
          >
             <Plus size={16} /> Mark Payment
          </button>
        )}
      </div>

       {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
            <CheckCircle size={20} className="text-emerald-400" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      {user?.role !== 'Student' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[ 
            { title: 'Total Revenue YTD', value: formatCurrency('124,500'), icon: IndianRupee, color: 'bg-emerald-500' },
            { title: 'Pending Receivables', value: formatCurrency('12,800'), icon: Clock, color: 'bg-amber-500' },
            { title: 'Success Rate', value: '94%', icon: Activity, color: 'bg-blue-500' },
          ].map((stat, i) => (
             <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
               <div className={`p-4 rounded-xl ${stat.color} text-white shadow-md shrink-0`}>
                  <stat.icon size={24} />
                </div>
              <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-none mb-1">{stat.title}</h3>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
               <div className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><CreditCard size={24} /></div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Fee Paid</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency('8,500.00')}</p>
               </div>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
               <div className="p-4 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100"><Clock size={24} /></div>
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pending Dues</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency('1,200.00')}</p>
               </div>
           </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
           <h2 className="text-lg font-bold text-slate-900">
             {user?.role === 'Student' ? 'My Academic Fee Statement' : 'Recent Transactions & Pending Dues'}
           </h2>
           {user?.role === 'Student' && (
             <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">2026 Academic Year</span>
           )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white uppercase text-slate-500 text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100">Fee Category & Type</th>
                <th className="px-6 py-4 border-b border-slate-100 italic">Financial Period</th>
                <th className="px-6 py-4 border-b border-slate-100">Total Amount</th>
                <th className="px-6 py-4 border-b border-slate-100">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Invoice Action</th>
              </tr>
            </thead>
            <tbody>
              {displayFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 group">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${fee.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                           {fee.type.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-base">{fee.type}</span>
                          <span className="text-xs text-slate-500 font-medium">Ref: #{fee.id.toUpperCase()}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                     {fee.type.includes('Term') ? 'Mid Term 2026' : fee.type.includes('Half') ? 'H1 Semester' : 'Full Session'}
                  </td>
                  <td className="px-6 py-4">
                     <span className="font-extrabold text-slate-900 block text-base">{formatCurrency(fee.totalAmount.toLocaleString())}</span>
                     <span className={`text-[10px] font-bold uppercase ${fee.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                       {fee.status === 'Paid' ? 'Full Payment Received' : 'Partial Payment Pending'}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${
                      fee.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : 
                      fee.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' :
                      'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {fee.status === 'Paid' ? (
                       <button 
                        onClick={() => handleDownloadBill(fee)}
                        className="px-4 py-2 flex items-center gap-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-[10px] uppercase active:scale-95"
                       >
                         <Download size={14} /> Download Bill
                       </button>
                    ) : (
                       <button 
                        className="px-4 py-2 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[10px] uppercase transition-all shadow-sm active:scale-95"
                       >
                         <CreditCard size={14} /> Pay Now
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default FinanceDashboard;
