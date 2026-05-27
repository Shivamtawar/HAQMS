'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/common/Navbar';
import { Monitor, RefreshCw, AlertCircle, Radio } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export default function QueueMonitor() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const mountedRef = useRef(true);

  const fetchQueueData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/queue`);
      if (!res.ok) throw new Error('Failed to retrieve active token queue.');
      const data = await res.json();
      if (mountedRef.current) {
        setTokens(data);
        setError('');
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchQueueData();
    const intervalId = setInterval(() => {
      fetchQueueData();
      setRefreshCount((prev) => prev + 1);
    }, 3000);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  const groupedTokens = tokens.reduce((groups, token) => {
    const docId = token.doctorId;
    if (!groups[docId]) {
      groups[docId] = {
        doctorName: token.doctor.name,
        specialization: token.doctor.specialization,
        calling: null,
        waiting: [],
      };
    }
    if (token.status === 'CALLING') groups[docId].calling = token;
    else if (token.status === 'WAITING') groups[docId].waiting.push(token);
    return groups;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 rounded-xl shadow-sm">
              <Monitor className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Live Queue Monitor</h1>
              <p className="text-xs text-slate-500 mt-0.5">Public display board — auto-syncs every 3 seconds</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono">
              {refreshCount} polls
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error} &mdash; Verify the backend API is online.
          </div>
        )}

        {/* Loading */}
        {loading && tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="pulse-loader"><div /><div /></div>
            <p className="text-sm text-slate-400">Loading active queues&hellip;</p>
          </div>
        ) : Object.keys(groupedTokens).length === 0 ? (
          <div className="glass rounded-2xl border border-dashed border-slate-200 p-14 text-center shadow-sm">
            <div className="inline-flex p-4 bg-slate-100 rounded-2xl mb-4">
              <Monitor className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">No active tokens</h3>
            <p className="mt-1.5 text-sm text-slate-400 max-w-sm mx-auto">
              No patient check-ins registered for today. Use the receptionist dashboard to check in patients.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedTokens).map(([docId, docInfo]) => (
              <div key={docId} className="glass rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

                {/* Doctor header */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                  <h3 className="font-bold text-slate-800 text-sm">{docInfo.doctorName}</h3>
                  <p className="text-xs text-teal-600 font-semibold mt-0.5 uppercase tracking-wide">
                    {docInfo.specialization}
                  </p>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-5">
                  {/* Now calling */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Now Calling</p>
                    {docInfo.calling ? (
                      <div className="rounded-xl bg-teal-600 p-5 text-center shadow-sm">
                        <span className="block text-5xl font-black text-white tracking-tight leading-none">
                          #{docInfo.calling.tokenNumber}
                        </span>
                        <span className="block text-xs font-medium text-teal-100 mt-2">
                          {docInfo.calling.patient.name}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-100 border border-slate-200 p-5 text-center">
                        <span className="block text-xl font-semibold text-slate-400">Idle</span>
                        <span className="block text-xs text-slate-400 mt-1">No active patient</span>
                      </div>
                    )}
                  </div>

                  {/* Queue list */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Waiting ({docInfo.waiting.length})
                    </p>
                    {docInfo.waiting.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {docInfo.waiting.map((token) => (
                          <span
                            key={token.id}
                            title={`Patient: ${token.patient.name}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600"
                          >
                            #{token.tokenNumber}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Queue empty</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
