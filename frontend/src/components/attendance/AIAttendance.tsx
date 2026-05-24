import { BellRing, CalendarCheck, ClipboardCheck, FileCheck2 } from 'lucide-react';

const AIAttendance = () => {
  return (
    <div className="space-y-4">
      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Attendance Monitoring</h1>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                AI assisted
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              The upload-assisted review flow is being revised. Manual attendance and class attendance workflows remain available for daily operations.
            </p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Update in progress
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-700">
              <CalendarCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Daily Attendance</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Class attendance pages remain active for regular teacher entry and correction.</p>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-700">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Teacher Review</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">The next review path will emphasize verification, correction, and audit-friendly records.</p>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Operational Notice</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Only the upload-assisted page is paused. Existing attendance data and reports are unaffected.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileCheck2 size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-950">Available Workflows</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Use Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-3 font-medium text-slate-900">Manual Attendance</td>
                <td className="px-3 py-3 text-emerald-700">Available</td>
                <td className="px-3 py-3 text-slate-600">Daily attendance entry for assigned classes.</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium text-slate-900">Class Attendance Review</td>
                <td className="px-3 py-3 text-emerald-700">Available</td>
                <td className="px-3 py-3 text-slate-600">Check attendance records and update recent entries.</td>
              </tr>
              <tr>
                <td className="px-3 py-3 font-medium text-slate-900">Upload-Assisted Attendance</td>
                <td className="px-3 py-3 text-amber-700">Paused</td>
                <td className="px-3 py-3 text-slate-600">Photo-assisted review flow under revision.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AIAttendance;
