import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { mockStudyMaterials } from '../../mock-data';
import { Plus, Download, FileText, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import jsPDF from 'jspdf';

const StudyMaterials = () => {
  const { user } = useAuthStore();
  const [materials, setMaterials] = useState(() => 
    user?.role === 'Teacher' 
      ? mockStudyMaterials 
      : mockStudyMaterials.filter(m => user?.classes?.includes(m.class) || m.class === user?.class)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleAddMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('material-file') as File;
    
    const newMaterial = {
      id: `sm${materials.length + 1}`,
      title: formData.get('title') as string,
      subject: user?.subject || (formData.get('subject') as string),
      class: formData.get('class') as string,
      uploadDate: new Date().toISOString().split('T')[0],
      file: file?.name || 'sample_document.pdf'
    };
    setMaterials([newMaterial, ...materials]);
    setIsModalOpen(false);
    setNotification(`"${newMaterial.title}" published with attachment!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownload = (item: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(item.title, 20, 30);
    doc.setFontSize(14);
    doc.text(`Subject: ${item.subject}`, 20, 45);
    doc.text(`Class: ${item.class}`, 20, 55);
    doc.text(`Upload Date: ${item.uploadDate}`, 20, 65);
    
    doc.setFontSize(12);
    doc.text('Summary of Learning Objectives:', 20, 85);
    doc.text('1. Understand core concepts defined in this module.', 25, 95);
    doc.text('2. Review the illustrated examples for better retention.', 25, 105);
    doc.text('3. Complete the practice problems at the end of the document.', 25, 115);
    
    doc.save(item.file);
    setNotification('Downloading study material...');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Materials</h1>
          <p className="text-slate-500 mt-1">Access and manage digital learning resources.</p>
        </div>
        {user?.role === 'Teacher' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus size={16} /> Upload Material
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800">
            <CheckCircle size={20} className="text-indigo-400" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <FileText size={24} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.uploadDate}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{item.subject}</span>
              <span className="text-xs text-slate-500 font-medium">Class {item.class}</span>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
               <button 
                onClick={() => handleDownload(item)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-100"
               >
                 <Download size={14} /> Download PDF Material
               </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Learning Material">
        <form onSubmit={handleAddMaterial} className="space-y-4">
           <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Material Title</label>
              <input name="title" required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" placeholder="e.g. Chapter 4: Thermodynamics" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Target Class</label>
                <select name="class" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm">
                   {user?.classes?.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Subject</label>
                <input name="subject" defaultValue={user?.subject} readOnly className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-600" />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Attachment (PDF)</label>
              <label className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer block relative">
                 <input type="file" name="material-file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" />
                 <Plus size={32} className="mx-auto text-slate-300 mb-2" />
                 <p className="text-sm text-slate-400 font-medium">Click to select PDF from device</p>
                 <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Maximum 10MB</p>
              </label>
           </div>
           <div className="pt-4 flex gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">Cancel</button>
             <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">Publish to Classroom</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudyMaterials;
