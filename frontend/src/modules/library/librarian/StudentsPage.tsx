import { useEffect, useState } from 'react';
import { fetchStudents } from '../../../services/erpContent';

const StudentsPage = () => {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await fetchStudents();
      if (!mounted) return;
      setStudents(s);
    })();
    return () => { mounted = false; };
  }, []);

  const grouped = students.reduce((acc: any, s) => {
    const grade = s.grade || 'Ungraded';
    acc[grade] = acc[grade] || {};
    const cls = s.sectionName || 'Unassigned';
    acc[grade][cls] = acc[grade][cls] || [];
    acc[grade][cls].push(s);
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6 lg:pb-12">
      <div>
        <h1 className="text-2xl font-bold">Students</h1>
        <p className="text-slate-500">Browse students created by admin. Tap a grade to expand classes.</p>
      </div>

      <div className="space-y-4">
        {Object.keys(grouped).map(grade => (
          <details key={grade} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <summary className="cursor-pointer font-semibold text-slate-900">{grade}</summary>
            <div className="mt-3 space-y-3">
              {Object.keys(grouped[grade]).map((cls:any) => (
                <details key={cls} className="bg-slate-50 rounded-xl p-3">
                  <summary className="font-medium">{cls} — {grouped[grade][cls].length} students</summary>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {grouped[grade][cls].map((s:any) => (
                      <div key={s.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.email}</div>
                        </div>
                        <div className="text-sm text-slate-500">{s.rollNo || ''}</div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default StudentsPage;
