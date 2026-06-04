// Proposal: Classic Symmetric Hero
// Concept: A two-column, light-themed layout that mirrors the in-app visual vocabulary
// from page one — same slate borders, same rounded-xl cards, same primary/amber/emerald
// accents used in Dashboard. The left column sells the product; the right column previews
// what the user will see the moment they sign in (a real task card + the "pending by
// priority" mini-strip) so the workspace stops being a black box.
//
// Signature elements:
//   1. Two-column symmetric hero — 50/50 on desktop, vertical stack on mobile
//   2. Live Dashboard preview card on the right (hero task + priority mini-strip)
//   3. White-card Google CTA with subtle hover, matching the Dashboard "Add Task" language

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Star, Calendar as CalendarIcon, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
};

const containerStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function TrustItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-[2px]" />
      <span className="leading-5">{children}</span>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC04"
        d="M5.84 14.1A6.62 6.62 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.47 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.16 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex items-stretch">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 px-8 sm:px-12 lg:px-16 xl:px-24 py-12 lg:py-16">
        {/* LEFT — Hero */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={containerStagger}
          className="flex flex-col justify-between min-h-[640px]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary text-on-primary grid place-items-center font-bold text-[18px] shadow-md">
              F
            </div>
            <span className="text-[20px] font-semibold tracking-tight text-on-surface">FocusFlow</span>
          </motion.div>

          <main className="max-w-[520px] py-12">
            <motion.p
              variants={fadeUp}
              className="text-[12px] font-bold uppercase tracking-[0.14em] text-primary mb-6"
            >
              Private workspace
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-[48px] sm:text-[56px] leading-[1.04] font-bold tracking-tight text-on-surface"
            >
              Start with a clear day.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-[17px] leading-7 text-on-surface-variant max-w-[480px]"
            >
              Sign in with your Google account to open your task list, calendar, priorities, and
              categories — all in one quiet, focused workspace.
            </motion.p>

            <motion.button
              variants={fadeUp}
              type="button"
              onClick={() => {
                window.location.href = api.googleLoginUrl();
              }}
              className="group mt-10 h-14 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 text-on-surface text-[15px] font-semibold inline-flex items-center gap-3 transition-all"
            >
              <span className="h-7 w-7 rounded-full bg-white border border-slate-100 grid place-items-center">
                <GoogleGlyph />
              </span>
              Continue with Google
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          </main>

          <motion.div
            variants={fadeUp}
            className="grid sm:grid-cols-3 gap-4 max-w-[560px] text-[13px] text-on-surface-variant"
          >
            <TrustItem>Google OAuth only</TrustItem>
            <TrustItem>Protected API access</TrustItem>
            <TrustItem>Cloud database ready</TrustItem>
          </motion.div>
        </motion.section>

        {/* RIGHT — Live preview card */}
        <section className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' as const, delay: 0.15 }}
            className="w-full max-w-[480px] bg-white rounded-3xl border border-slate-100 shadow-xl p-7 hover:-translate-y-1 hover:shadow-2xl transition-all duration-200"
          >
            {/* Card header — matches Dashboard top bar language */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md bg-primary text-on-primary grid place-items-center text-[10px] font-bold">
                  F
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  FocusFlow · Today
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">11:42</span>
            </div>

            {/* Hero task card — same vocabulary as Dashboard task-card */}
            <div className="group relative p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex items-center gap-4 bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
              <div className="shrink-0 ml-2">
                <div
                  role="img"
                  aria-label="Task checkbox (preview)"
                  className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[16px] text-slate-900 truncate">
                  Review Q3 product roadmap
                </h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
                    <CalendarIcon size={14} /> Today, 14:00
                  </span>
                  <span className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
                    <Clock size={12} /> 2h
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    Work
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600">
                    High
                  </span>
                </div>
              </div>
              <div className="shrink-0 pl-3 border-l border-slate-100">
                <span className="p-2 rounded-xl text-amber-500 bg-amber-50 inline-flex">
                  <Star fill="currentColor" size={20} />
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            {/* Pending by priority — same widget vocabulary as Dashboard bottom strip */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                  Pending by priority
                </h4>
                <span className="text-[11px] font-medium text-emerald-600">2 completed</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100/50">
                  <span className="block text-[10px] font-bold text-red-600 uppercase tracking-wider mb-0.5">
                    High
                  </span>
                  <span className="block text-[20px] font-bold text-red-700 leading-none">3</span>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100/50">
                  <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">
                    Medium
                  </span>
                  <span className="block text-[20px] font-bold text-blue-700 leading-none">5</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100/50">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Low
                  </span>
                  <span className="block text-[20px] font-bold text-slate-700 leading-none">2</span>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[12px] text-slate-400">
              What you'll see the moment you sign in.
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
