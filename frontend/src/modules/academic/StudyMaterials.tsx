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
    <div className="erp-page h-full lg:pb-12">
      <div className="erp-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="erp-kicker">7. Study Materials</p>
          <h1 className="erp-title">Study Materials</h1>
          <p className="erp-subtitle">One Google Drive folder per class subject, visible only to the right class.</p>
        </div>
        {user?.role === 'Teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="erp-primary-button flex items-center gap-2 px-4 py-2 text-sm transition-colors"
          >
            <Plus size={16} /> Link Subject Folder
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed right-6 top-20 z-50">
          <div className="flex items-center gap-3 rounded border border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-lg">
            <CheckCircle size={18} className="text-blue-300" />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="erp-card p-6 text-sm text-slate-500">
          Loading study materials...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((item) => (
            <div key={item.id} className="erp-card group p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="rounded border border-blue-100 bg-blue-50 p-3 text-blue-700">
                  <FileText size={22} />
                </div>
                <span className="erp-section-label">{item.uploadDate}</span>
              </div>
              <h3 className="text-base font-bold leading-tight text-slate-900">{item.subject} Folder</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{item.subject}</span>
                <span className="text-xs text-slate-500 font-medium">Class {item.class}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenMaterial(item)}
                  className="flex w-full items-center justify-center gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <ExternalLink size={14} /> Open Drive Material
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredMaterials.length === 0 && (
        <div className="erp-card p-6 text-sm text-slate-500">
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
                className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {visibleClasses.map((className) => <option key={className} value={className}>Class {className}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Subject</label>
              <select name="subject" className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
              className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-400">Paste the shareable folder link. Put as many files as you want inside that folder.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded border border-slate-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
            <button type="submit" className="erp-primary-button flex-1 px-4 py-2.5 transition-colors">Publish Material</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudyMaterials;
