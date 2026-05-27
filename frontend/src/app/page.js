'use client';

import Link from 'next/link';
import { Activity, ShieldAlert, MonitorPlay, Users, CalendarDays, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
        <div className="w-full max-w-3xl mx-auto text-center">

          {/* Live status chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Live Queue Tracking Active
          </div>

          {/* Wordmark */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2.5 bg-teal-600 rounded-xl shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              HAQMS
            </h1>
          </div>
          <p className="text-lg sm:text-xl font-medium text-slate-500 mb-3">
            Hospital Appointment &amp; Queue Management System
          </p>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            A deliberately flawed reference application for evaluating software engineering candidates.
            Find and fix real architectural, security, and performance issues.
          </p>

          {/* Navigation cards */}
          <div className="mt-12 grid gap-5 sm:grid-cols-2 max-w-2xl mx-auto">
            <Link href="/login" className="group text-left glass rounded-2xl p-7 shadow-sm border border-slate-200 card-hover">
              <div className="inline-flex p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600 mb-5 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-colors duration-200">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                Staff Portal
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Role-based dashboards for Administrators, Doctors, and Receptionists.
              </p>
            </Link>

            <Link href="/queue" className="group text-left glass rounded-2xl p-7 shadow-sm border border-slate-200 card-hover">
              <div className="inline-flex p-2.5 bg-teal-50 border border-teal-100 rounded-xl text-teal-600 mb-5 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-colors duration-200">
                <MonitorPlay className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                Live Queue Monitor
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                Public display board with real-time patient call tokens. Refreshes every 3 seconds.
              </p>
            </Link>
          </div>

          {/* Assessment notice */}
          <div className="mt-10 max-w-xl mx-auto glass rounded-2xl p-5 border border-amber-200/80 bg-amber-50/50 text-left flex gap-4 shadow-sm">
            <div className="shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Assessment Environment</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This codebase contains intentional security vulnerabilities, N+1 query patterns,
                race conditions, and frontend memory leaks. Evaluate, trace, and fix them.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-slate-400 text-xs py-6 border-t border-slate-100">
        HAQMS v1.0.0 &mdash; Candidate Evaluation Framework &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
