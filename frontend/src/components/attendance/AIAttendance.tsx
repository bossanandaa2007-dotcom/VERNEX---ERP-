import { BellRing, CalendarCheck, Sparkles } from 'lucide-react';

const AIAttendance = () => {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-3 py-6 sm:px-6 lg:py-10">
      <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-slate-950 p-6 text-white sm:p-8 lg:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
              <Sparkles size={28} />
            </div>
            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
              AI Attendance
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Coming Soon
            </h1>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-slate-300">
              We are preparing a cleaner AI-assisted attendance workflow for teachers. This page will return with a focused review experience once the update is ready.
            </p>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Attendance tools stay available</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    Manual attendance and class attendance pages are still active. Only the AI upload flow is paused for this update.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <BellRing size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Update in progress</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    The next version will be designed around accuracy, simple corrections, and a faster teacher review path.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AIAttendance;
