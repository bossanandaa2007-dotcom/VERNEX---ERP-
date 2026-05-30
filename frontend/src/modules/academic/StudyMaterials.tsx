import { useEffect, useMemo, useState } from 'react';
import { Plus, ExternalLink, FileText, CheckCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import { createStudyMaterial, fetchStudyMaterials, type StudyMaterial } from '../../services/erpContent';
import { fetchTeacherMarkScopes, type TeacherMarkScope } from '../../services/marks';

const isGoogleDriveUrl = (value: string) => /^https:\/\/(drive|docs)\.google\.com\//i.test(value.trim());

const StudyMaterials = () => {
  const { user } = useAuthStore();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [teacherScopes, setTeacherScopes] = useState<TeacherMarkScope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('');

  const visibleClasses = useMemo(() => {
    if (user?.role === 'Teacher') {
      return Array.from(new Set(teacherScopes.map((scope) => scope.className)));
    }

    return user?.class ? [user.class] : [];
  }, [teacherScopes, user]);

  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          teacherScopes
            .filter((scope) => scope.className === selectedClass)
            .map((scope) => scope.subject)
        )
      ),
    [selectedClass, teacherScopes]
  );

  const filteredMaterials = useMemo(() => {
    if (user?.role !== 'Teacher') {
      return materials;
    }

    const allowed = new Set(teacherScopes.map((scope) => `${scope.sectionId}:${scope.subject.toLowerCase()}`));
    return materials.filter((item) => {
      if (!item.sectionId) {
        return false;
      }

      return allowed.has(`${item.sectionId}:${item.subject.toLowerCase()}`);
    });
  }, [materials, teacherScopes, user?.role]);

  useEffect(() => {
    let isMounted = true;

    const loadScopes = async () => {
      if (user?.role !== 'Teacher' || !user.id) {
        return;
      }

      try {
        const scopes = await fetchTeacherMarkScopes(user.id);
        if (isMounted) {
          setTeacherScopes(scopes);
          setSelectedClass((current) => current || scopes[0]?.className || '');
        }
      } catch (error) {
        console.error('Failed to load teacher study material scopes:', error);
      }
    };

    void loadScopes();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    let isMounted = true;

    const loadMaterials = async () => {
      try {
        setIsLoading(true);
        const data = await fetchStudyMaterials(user?.role === 'Teacher' ? undefined : visibleClasses);
        if (isMounted) {
          setMaterials(data);
        }
      } catch (error) {
        console.error('Failed to load study materials:', error);
        if (isMounted) {
          setNotification('Unable to load study materials right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadMaterials();

    return () => {
      isMounted = false;
    };
  }, [user?.role, visibleClasses]);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const handleAddMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const driveUrl = (formData.get('drive-url') as string || '').trim();
    const targetClass = (formData.get('class') as string) || selectedClass;
    const subject = (formData.get('subject') as string || '').trim();

    if (!isGoogleDriveUrl(driveUrl)) {
      showToast('Please paste a valid Google Drive or Google Docs link.');
      return;
    }

    if (!targetClass || !subject) {
      showToast('Please choose a valid class and subject.');
      return;
    }

    try {
      const created = await createStudyMaterial({
        title: `${targetClass} ${subject} Study Folder`,
        subject,
        class: targetClass,
        teacherProfileId: user?.id,
        driveUrl,
      });
      setMaterials((current) => {
        const next = current.filter((item) => !(item.sectionId === created.sectionId && item.subject === created.subject));
        return [created, ...next];
      });
      setIsModalOpen(false);
      showToast(`Updated ${created.class} ${created.subject} study folder.`);
    } catch (error) {
      console.error('Failed to create study material:', error);
      showToast('Could not publish the study material.');
    }
  };

  const handleOpenMaterial = (item: StudyMaterial) => {
    if (!item.driveUrl) {
      showToast('No Google Drive link is stored for this material yet.');
      return;
    }

    window.open(item.driveUrl, '_blank', 'noopener,noreferrer');
    showToast('Opening study material...');
  };

  return (
    <div className="space-y-6 lg:pb-12 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Materials</h1>
          <p className="text-slate-500 mt-1">One Google Drive folder per class subject, visible only to the right class.</p>
        </div>
        {user?.role === 'Teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus size={16} /> Link Subject Folder
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

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-sm text-slate-500 shadow-sm">
          Loading study materials from Supabase...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <FileText size={24} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.uploadDate}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{item.subject} Folder</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{item.subject}</span>
                <span className="text-xs text-slate-500 font-medium">Class {item.class}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenMaterial(item)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-100"
                >
                  <ExternalLink size={14} /> Open Drive Material
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredMaterials.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-sm text-slate-500 shadow-sm">
          No study materials are available for this profile yet.
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Link Subject Folder">
        <form onSubmit={handleAddMaterial} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Target Class</label>
              <select
                name="class"
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
              >
                {visibleClasses.map((className) => <option key={className} value={className}>Class {className}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Subject</label>
              <select name="subject" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm">
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Google Drive Folder Link</label>
            <input
              name="drive-url"
              type="url"
              required
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
            />
            <p className="text-xs text-slate-400">Paste the shareable folder link. Put as many files as you want inside that folder.</p>
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
