'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_STYLES = {
  COMPLETED: { icon: CheckCircle, cls: 'text-teal-600 bg-teal-500/10 border-teal-500/20' },
  CANCELLED: { icon: XCircle,     cls: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  PENDING:   { icon: Clock,       cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
};

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const { token, user, API_BASE_URL } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Patient not found.' : 'Failed to load patient records.');
        }

        const data = await res.json();
        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="pulse-loader"><div></div><div></div></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {patient && (
          <>
            {/* Patient header card */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                    {patient.name}
                  </h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {patient.gender} &nbsp;·&nbsp; {patient.age} yrs &nbsp;·&nbsp; {patient.phoneNumber}
                    {patient.email && <> &nbsp;·&nbsp; {patient.email}</>}
                  </p>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Diagnostic Records
                </span>
              </div>

              {/* Medical history */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Medical Background
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {patient.medicalHistory ?? (
                    <span className="italic text-slate-400">No medical history on record.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Appointment history */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-5">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Appointment History
              </h2>

              {patient.appointments.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm italic">
                  No appointments found for this patient.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...patient.appointments]
                    .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
                    .map((appt) => {
                      const { icon: Icon, cls } = STATUS_STYLES[appt.status] ?? STATUS_STYLES.PENDING;
                      return (
                        <div
                          key={appt.id}
                          className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 hover:border-teal-500/30 transition-colors"
                        >
                          <div className={`p-2 rounded-lg border ${cls} shrink-0`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {appt.reason || 'No reason specified'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(appt.appointmentDate).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-0.5 rounded text-xxs font-extrabold uppercase tracking-wide border ${cls}`}>
                            {appt.status}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
