import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      <section className="flex-1 min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_480px]">
        <div className="px-8 sm:px-12 lg:px-20 py-10 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary text-on-primary grid place-items-center font-bold">
              F
            </div>
            <span className="text-[18px] font-semibold">FocusFlow</span>
          </div>

          <main className="max-w-[680px] py-16">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary mb-5">
              Private workspace
            </p>
            <h1 className="text-[44px] sm:text-[56px] leading-[1.02] font-bold tracking-normal text-on-surface max-w-[620px]">
              Start with a clear day.
            </h1>
            <p className="mt-6 text-[17px] leading-7 text-on-surface-variant max-w-[560px]">
              Sign in with your Google account to open your task list, calendar, priorities, and categories.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = api.googleLoginUrl();
              }}
              className="mt-10 h-12 px-5 rounded-md bg-on-surface text-white inline-flex items-center gap-3 text-[15px] font-semibold hover:bg-inverse-surface transition-colors"
            >
              <span className="h-6 w-6 rounded-full bg-white grid place-items-center text-[14px] font-bold text-on-surface">
                G
              </span>
              Continue with Google
              <ArrowRight className="h-4 w-4" />
            </button>
          </main>

          <div className="grid sm:grid-cols-3 gap-4 max-w-[760px] text-[13px] text-on-surface-variant">
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-[2px]" />
              <span>Google OAuth only</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-[2px]" />
              <span>Protected API access</span>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-[2px]" />
              <span>Cloud database ready</span>
            </div>
          </div>
        </div>

        <aside className="hidden lg:flex min-h-screen bg-inverse-surface text-inverse-on-surface p-8 flex-col justify-between">
          <div className="border border-white/15 rounded-lg p-6">
            <div className="text-[13px] uppercase tracking-[0.08em] text-white/60 font-semibold">
              Today
            </div>
            <div className="mt-8 space-y-3">
              {['Plan product work', 'Review calendar', 'Finish one important task'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/8 px-4 py-3">
                  <span className="h-7 w-7 rounded-full bg-white/12 grid place-items-center text-[13px]">
                    {index + 1}
                  </span>
                  <span className="text-[14px]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[14px] leading-6 text-white/65">
            A focused task system for daily planning, quiet prioritization, and keeping your calendar honest.
          </p>
        </aside>
      </section>
    </div>
  );
}
