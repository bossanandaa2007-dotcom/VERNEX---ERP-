import { useEffect, useMemo, useState } from 'react';
import { BookMarked, Plus, Download, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../../components/common/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import { createAssignment, fetchAssignments, submitAssignment, type Assignment } from '../../services/erpContent';

const isGoogleDriveUrl = (value: string) => /^https:\/\/(drive|docs)\.google\.com\//i.test(value.trim());

const Assignments = () => {
  const { user } = useAuthStore();
  const teacherSubjects = user?.subjects?.length ? user.subjects : (user?.subject ? [user.subject] : []);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsgn, setSelectedAsgn] = useState<Assignment | null>(null);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionTarget, setSubmissionTarget] = useState<Assignment | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const visibleClasses = useMemo(() => {
    if (user?.role === 'Teacher') {
      return user.classes || [];
    }

    return user?.class ? [user.class] : [];
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAssignments(user?.role === 'Teacher' ? undefined : visibleClasses);
        if (isMounted) {
          setAssignments(data);
        }
      } catch (error) {
        console.error('Failed to load assignments:', error);
        if (isMounted) {
          setNotification('Unable to load assignments right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      isMounted = false;
    };
  }, [user?.role, visibleClasses]);

  const showToast = (message: string) => {
    setNotification(message);
    window.setTimeout(() => setNotification(null), 3000);
  };

  const handleAddAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const driveUrl = (formData.get('drive-url') as string || '').trim();

    if (!isGoogleDriveUrl(driveUrl)) {
      showToast('Please paste a valid Google Drive or Google Docs link.');
      return;
    }

    try {
      const created = await createAssignment({
        title: formData.get('title') as string,
        subject: (formData.get('subject') as string) || teacherSubjects[0] || 'General',
        class: formData.get('class') as string,
        deadline: formData.get('deadline') as string,
        description: formData.get('description') as string,
        driveUrl,
        teacher_id: user?.id,
      });

      setAssignments((current) => [created, ...current]);
      setIsModalOpen(false);
      showToast('Assignment created and published!');
    } catch (error) {
      console.error('Failed to create assignment:', error);
      showToast('Could not create the assignment.');
    }
  };

  const handleDownloadSubmissionsReport = (asgn: Assignment) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Submission Report: ${asgn.title}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Subject: ${asgn.subject} | Deadline: ${asgn.deadline}`, 14, 22);

    const tableData = asgn.submissions.map((submission, idx) => [
      idx + 1,
      submission.student_name,
      submission.submitted_at,
      submission.submissionUrl,
      'Accepted',
    ]);

    autoTable(doc, {
      head: [['Sr.', 'Student Name', 'Date Submitted', 'Drive Link', 'Status']],
      body: tableData.length ? tableData : [['-', 'No submissions yet', '-', '-', '-']],
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`${asgn.title}_submissions.pdf`);
  };

  const handleOpenAssignment = (asgn: Assignment) => {
    if (!asgn.driveUrl) {
      showToast('No Google Drive link is stored for this assignment yet.');
      return;
    }

    window.open(asgn.driveUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) {
      showToast('Student profile is missing an email address.');
      return;
    }

    if (!submissionTarget) {
      showToast('No assignment selected for submission.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const submissionUrl = (formData.get('submission-url') as string || '').trim();

    if (!isGoogleDriveUrl(submissionUrl)) {
      showToast('Please paste a valid Google Drive or Google Docs link.');
      return;
    }

    try {
      const submission = await submitAssignment(submissionTarget.id, user.id, user.name || 'Student', submissionUrl);
      setAssignments((current) =>
        current.map((item) =>
          item.id === submissionTarget.id
            ? { ...item, submissions: [...item.submissions, submission] }
            : item
        )
      );
      setIsSubmitModalOpen(false);
      setSubmissionTarget(null);
      showToast('Your assignment has been submitted successfully!');
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      showToast('Could not submit the assignment.');
    }
  };

  return (
    <div className="erp-page h-full lg:pb-12">
      <div className="erp-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="erp-kicker">8. Academic Assignments</p>
          <h1 className="erp-title">Academic Assignments</h1>
          <p className="erp-subtitle">Track deadlines and manage coursework through Google Drive links.</p>
        </div>
        {user?.role === 'Teacher' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="erp-primary-button flex items-center gap-2 px-4 py-2 text-sm transition-colors"
          >
            <Plus size={16} /> Create Assignment
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed right-6 top-20 z-50">
          <div className="flex items-center gap-3 rounded border border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-lg">
            <CheckCircle size={18} />
            <p className="font-semibold text-sm">{notification}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="erp-card p-6 text-sm text-slate-500">
          Loading assignments...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {assignments.map((asgn) => {
            const hasSubmitted = asgn.submissions.some((submission) => submission.student_id === user?.id);
            return (
              <div key={asgn.id} className="erp-card group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
                {hasSubmitted && (
                  <div className="absolute right-3 top-3 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-100">
                    Submitted
                  </div>
                )}
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded border border-blue-100 bg-blue-50 p-3 text-blue-700">
                      <BookMarked size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{asgn.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">Published in {asgn.subject} · {asgn.class}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="flex items-center gap-1 rounded border border-rose-100 bg-rose-50 px-2 py-1 text-xs font-bold uppercase text-rose-600">
                      <Clock size={12} /> {asgn.deadline}
                    </span>
                  </div>
                </div>

                <p className="mb-5 min-h-[60px] rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                  {asgn.description}
                </p>

                <div className="mb-6">
                  <button
                    onClick={() => handleOpenAssignment(asgn)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    <ExternalLink size={14} /> Open assignment link
                  </button>
                </div>

                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user?.role === 'Teacher' ? (
                      <button
                        onClick={() => { setSelectedAsgn(asgn); setIsSubmissionsOpen(true); }}
                        className="text-sm font-bold text-blue-700 hover:underline"
                      >
                        View {asgn.submissions.length} Submissions
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Stored in the live assignments database</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {user?.role === 'Teacher' ? (
                      <button
                        onClick={() => handleDownloadSubmissionsReport(asgn)}
                        className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-800"
                      >
                        <Download size={14} /> Export Submissions
                      </button>
                    ) : (
                      <button
                        disabled={hasSubmitted}
                        onClick={() => {
                          setSubmissionTarget(asgn);
                          setIsSubmitModalOpen(true);
                        }}
                        className={`rounded px-6 py-2 text-xs font-bold transition-colors ${hasSubmitted ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-blue-700 text-white hover:bg-blue-800'}`}
                      >
                        {hasSubmitted ? 'Submission Linked' : 'Submit Drive Link'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && assignments.length === 0 && (
        <div className="erp-card p-6 text-sm text-slate-500">
          No assignments are available for this profile yet.
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Coursework">
        <form onSubmit={handleAddAssignment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Assignment Title</label>
            <input name="title" required className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Select Class</label>
              <select name="class" className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {visibleClasses.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Subject</label>
              <select name="subject" className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {teacherSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Submission Deadline</label>
              <input name="deadline" type="date" required className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Instructions / Guidelines</label>
            <textarea name="description" rows={4} required className="erp-input w-full resize-none px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Google Drive Link</label>
            <input
              name="drive-url"
              type="url"
              required
              placeholder="https://drive.google.com/..."
              className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-400">Paste the shareable assignment brief or worksheet link.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded border border-slate-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Discard</button>
            <button type="submit" className="erp-primary-button flex-1 px-4 py-2.5 transition-colors">Create Assignment</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSubmissionsOpen} onClose={() => setIsSubmissionsOpen(false)} title="Submission Tracking">
        {selectedAsgn && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">{selectedAsgn.title}</h4>
            <div className="space-y-2">
              {selectedAsgn.submissions.length > 0 ? selectedAsgn.submissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{submission.student_name}</p>
                    <p className="erp-section-label">{submission.submitted_at}</p>
                  </div>
                  <button
                    onClick={() => window.open(submission.submissionUrl, '_blank', 'noopener,noreferrer')}
                    className="rounded bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              )) : (
                <div className="py-8 text-center text-slate-500 text-sm">No submissions received yet.</div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => handleDownloadSubmissionsReport(selectedAsgn)}
                className="erp-primary-button w-full py-2.5 text-sm transition-colors"
              >
                Download Full PDF Report
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isSubmitModalOpen} onClose={() => { setIsSubmitModalOpen(false); setSubmissionTarget(null); }} title="Submit Assignment Link">
        <form onSubmit={handleSubmitAssignment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Assignment</label>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
              {submissionTarget?.title || 'No assignment selected'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Your Google Drive Link</label>
            <input
              name="submission-url"
              type="url"
              required
              placeholder="https://drive.google.com/..."
              className="erp-input w-full px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-400">Paste the shareable Google Drive link to your completed work.</p>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => { setIsSubmitModalOpen(false); setSubmissionTarget(null); }} className="flex-1 rounded border border-slate-200 px-4 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
            <button type="submit" className="erp-primary-button flex-1 px-4 py-2.5 transition-colors">Submit Link</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Assignments;
