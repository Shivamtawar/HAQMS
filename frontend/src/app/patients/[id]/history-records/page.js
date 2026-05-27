'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, CalendarDays, CheckCircle, XCircle, Clock, User } from 'lucide-react';

const STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle, badgeCls: 'badge-teal' },
  CANCELLED:  { icon: XCircle,     badgeCls: 'badge-rose' },
  PENDING:    { icon: Clock,       badgeCls: 'badge-amber' },
};

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const { token, user, API_BASE_URL } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }

    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(res.status === 404 ? 'Patient not found.' : 'Failed to load patient records.');
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 space-y-6">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="pulse-loader"><div /><div /></div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {patient && (
          <>
            {/* Patient header */}
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl">
                    <User className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {patient.gender} &nbsp;&middot;&nbsp; {patient.age} yrs &nbsp;&middot;&nbsp; {patient.phoneNumber}
                      {patient.email && <> &nbsp;&middot;&nbsp; {patient.email}</>}
                    </p>
                  </div>
                </div>
                <span className="badge badge-teal shrink-0">Records</span>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Medical Background
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {patient.medicalHistory ?? (
                    <span className="italic text-slate-400">No medical history on record.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Appointment history */}
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Appointment History
                <span className="ml-auto text-xs text-slate-400 font-normal">{patient.appointments.length} records</span>
              </h2>

              {patient.appointments.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400 italic">
                  No appointments found for this patient.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {[...patient.appointments]
                    .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
                    .map((appt) => {
                      const { icon: Icon, badgeCls } = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.PENDING;
                      return (
                        <div
                          key={appt.id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors"
                        >
                          <div className={`p-2 rounded-lg badge ${badgeCls} border`} style={{ background: undefined }}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {appt.reason || 'No reason specified'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(appt.appointmentDate).toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                          <span className={`badge ${badgeCls} shrink-0`}>{appt.status}</span>
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
