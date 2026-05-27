'use client';

import Link from 'next/link';
import { Activity, ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-bg px-4 py-12 text-center">

      <Link href="/" className="flex items-center gap-2.5 mb-12 group">
        <div className="p-2 bg-teal-600 rounded-xl shadow-md group-hover:bg-teal-700 transition-colors">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tight">HAQMS</span>
      </Link>

      <div className="glass rounded-2xl border border-slate-200 shadow-lg p-10 max-w-sm w-full">
        <div className="inline-flex p-4 bg-slate-100 rounded-2xl mb-6">
          <FileQuestion className="h-8 w-8 text-slate-400" />
        </div>

        <h1 className="text-5xl font-black text-slate-800 tracking-tight">404</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-700">Page not found</h2>

        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Candidate Note</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            This route was intentionally left incomplete. The &ldquo;View Medical Records&rdquo; link
            triggers this 404 — your task includes building the missing page to fetch and render
            patient records.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="glow-btn mt-6 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
