'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, CalendarDays, Activity, Search, UserPlus,
  Trash2, ClipboardList, TrendingUp, Clock,
  ArrowRight, ShieldAlert, CheckCircle, Award,
  X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, API_BASE_URL, logout } = useAuth();
  const router = useRouter();

  // ── All hooks must come before any early return ───────────────────────────────
  const [activeTab, setActiveTab] = useState('patients');

  // ── Receptionist state ──────────────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  const [doctorsList, setDoctorsList] = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [checkinMessage, setCheckinMessage] = useState('');

  // ── Doctor state ─────────────────────────────────────────────────────────────
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // ── Admin state ───────────────────────────────────────────────────────────────
  const [adminReportData, setAdminReportData] = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Set correct default tab once user is known
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    setActiveTab(user.role === 'ADMIN' ? 'reports' : user.role === 'RECEPTIONIST' ? 'patients' : 'appointments');
  }, [user]);

  // ── Receptionist functions ───────────────────────────────────────────────────
  const fetchPatients = async (page = 1) => {
    setPatientsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/patients?page=${page}&limit=5&search=${patientSearch}&gender=${patientGender}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setPatientsPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          totalPatients: data.pagination.totalPatients,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPatientsLoading(false);
    }
  };

  const searchDebounceRef = useRef(null);
  useEffect(() => {
    if (!user || (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN')) return;
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchPatients(1), 350);
    return () => clearTimeout(searchDebounceRef.current);
  }, [patientSearch, patientGender]);

  const fetchDoctorsDropdown = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDoctorsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchDoctorsDropdown(); }, []);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');
    if (!regName || !regPhone || !regAge) {
      setRegMessage('error:Name, Age and Phone are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: regName, email: regEmail, phoneNumber: regPhone, age: regAge, gender: regGender, medicalHistory: regHistory }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegMessage('success:Patient registered successfully.');
        setRegName(''); setRegEmail(''); setRegPhone(''); setRegAge(''); setRegHistory('');
        fetchPatients(1);
      } else {
        setRegMessage(`error:${data.error || 'Failed to register'}`);
      }
    } catch (err) {
      setRegMessage(`error:${err.message}`);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingMessage('');
    if (!bookingPatientId || !bookingDoctorId || !bookingDate) {
      setBookingMessage('error:All booking fields are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId: bookingPatientId, doctorId: bookingDoctorId, appointmentDate: bookingDate, reason: bookingReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingMessage('success:Appointment booked successfully.');
        setBookingReason('');
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setBookingMessage(`error:${data.error || 'Failed to book'}`);
      }
    } catch (err) {
      setBookingMessage(`error:${err.message}`);
    }
  };

  const handleDeletePatient = async (id) => {
    if (!confirm('Delete this patient record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchPatients(patientsPagination.page);
      } else {
        alert(`Error: ${data.error || 'Unauthorized deletion!'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/queue/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId, doctorId, appointmentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinMessage(`success:Checked in — Token #${data.token.tokenNumber} generated.`);
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setCheckinMessage(`error:${data.error}`);
      }
    } catch (err) {
      setCheckinMessage(`error:${err.message}`);
    }
  };

  // ── Doctor functions ──────────────────────────────────────────────────────────
  const fetchDoctorWorklist = async () => {
    if (user.role !== 'DOCTOR') return;
    try {
      const matchedDoc = doctorsList.find((d) => d.userId === user.id);
      if (!matchedDoc) return;
      const [appRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/appointments?doctorId=${matchedDoc.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/queue?doctorId=${matchedDoc.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const appData = await appRes.json();
      const queueData = await queueRes.json();
      if (appData.success) setDoctorAppointments(appData.appointments);
      setDoctorQueue(queueData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && user.role === 'DOCTOR' && doctorsList.length > 0) fetchDoctorWorklist();
  }, [doctorsList]);

  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/queue/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchDoctorWorklist();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteAppointment = async (appId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) fetchDoctorWorklist();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Admin functions ───────────────────────────────────────────────────────────
  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/doctor-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdminReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const searchPhysiciansAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors?search=${adminSearchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setDoctorsList(data);
      else alert(`API Error: ${data.sqlMessage || data.error}`);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  if (!user) return null;

  const msgType = (msg) => msg?.startsWith('success:') ? 'success' : 'error';
  const msgText = (msg) => msg?.replace(/^(success|error):/, '') || '';

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:border-teal-500 transition-colors';
  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  const tabs = [
    ...(user.role === 'ADMIN' ? [
      { id: 'reports', label: 'Reports', icon: TrendingUp },
      { id: 'physicians', label: 'Physicians', icon: Award },
    ] : []),
    ...(user.role === 'RECEPTIONIST' || user.role === 'ADMIN' ? [
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'book', label: 'Scheduling', icon: CalendarDays },
    ] : []),
    ...(user.role === 'DOCTOR' ? [
      { id: 'appointments', label: 'Appointments', icon: CalendarDays },
      { id: 'queue', label: 'Queue', icon: Clock },
    ] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 py-8 space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Global notification */}
        {checkinMessage && (
          <div className={`flex items-center justify-between p-3.5 rounded-xl border text-sm ${
            msgType(checkinMessage) === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            <span>{msgText(checkinMessage)}</span>
            <button onClick={() => setCheckinMessage('')} className="p-0.5 rounded hover:bg-black/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── PATIENTS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'patients' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Directory */}
            <div className="lg:col-span-2 glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-teal-600" />
                Patient Directory
              </h2>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search name, phone or email…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:border-teal-500 transition-colors"
                  />
                </div>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:border-teal-500 transition-colors"
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {patientsLoading ? (
                <p className="text-center py-8 text-sm text-slate-400 animate-pulse">Loading…</p>
              ) : patients.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">No patients match this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                        <th className="pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</th>
                        <th className="pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Age / Sex</th>
                        <th className="pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {patients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-medium text-slate-800">
                            {p.name}
                            {p.email && <span className="block text-xs text-slate-400 mt-0.5">{p.email}</span>}
                          </td>
                          <td className="py-3 text-slate-500">{p.phoneNumber}</td>
                          <td className="py-3 text-slate-500">{p.age} yrs / {p.gender}</td>
                          <td className="py-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 border border-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors"
                            >
                              Check In
                            </button>
                            <button
                              onClick={() => handleDeletePatient(p.id)}
                              title="Delete patient"
                              className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Page {patientsPagination.page} of {patientsPagination.totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={patientsPagination.page <= 1}
                    onClick={() => fetchPatients(patientsPagination.page - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button
                    disabled={patientsPagination.page >= patientsPagination.totalPages}
                    onClick={() => fetchPatients(patientsPagination.page + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Registration form */}
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 h-fit">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-teal-600" />
                New Patient
              </h2>

              {regMessage && (
                <div className={`p-3 rounded-lg text-sm border ${
                  msgType(regMessage) === 'success'
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {msgText(regMessage)}
                </div>
              )}

              <form onSubmit={handleRegisterPatient} className="space-y-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Bruce Wayne" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Age *</label>
                    <input type="number" required value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="35" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Gender *</label>
                    <select value={regGender} onChange={(e) => setRegGender(e.target.value)} className={inputCls}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Phone *</label>
                  <input type="text" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="555-0199" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="bruce@wayne.com" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Medical History</label>
                  <textarea value={regHistory} onChange={(e) => setRegHistory(e.target.value)} placeholder="Cardiovascular risks, asthma…" rows="3" className={inputCls + ' resize-none'} />
                </div>

                <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
                  Register Patient
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── SCHEDULING TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'book' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Book appointment */}
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Schedule Appointment
              </h2>

              {bookingMessage && (
                <div className={`p-3 rounded-lg text-sm border ${
                  msgType(bookingMessage) === 'success'
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {msgText(bookingMessage)}
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div>
                  <label className={labelCls}>Patient *</label>
                  <select required value={bookingPatientId} onChange={(e) => setBookingPatientId(e.target.value)} className={inputCls}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Register the patient in the Patients tab first if missing.</p>
                </div>

                <div>
                  <label className={labelCls}>Physician *</label>
                  <select required value={bookingDoctorId} onChange={(e) => setBookingDoctorId(e.target.value)} className={inputCls}>
                    <option value="">Select physician…</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialization} (${d.consultationFee})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Date &amp; Time *</label>
                  <input type="datetime-local" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Reason</label>
                  <input type="text" value={bookingReason} onChange={(e) => setBookingReason(e.target.value)} placeholder="Regular diagnostic review…" className={inputCls} />
                </div>

                <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
                  Book Appointment
                </button>
              </form>
            </div>

            {/* Walk-in check-in */}
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Walk-in Queue Check-in
                </h2>
                <p className="text-xs text-slate-500 mt-1">Generate an immediate waiting token for a direct walk-in patient.</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
                <strong>Token Engine Note:</strong> Direct arrivals bypass appointments. The engine fetches the current day&apos;s max token and increments.{' '}
                <span className="font-semibold">Warning: vulnerable to race conditions.</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Walk-in Patient *</label>
                  <select id="walkin-patient" className={inputCls}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Assign Physician *</label>
                  <select id="walkin-doctor" className={inputCls}>
                    <option value="">Select physician…</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    const pId = document.getElementById('walkin-patient').value;
                    const dId = document.getElementById('walkin-doctor').value;
                    if (!pId || !dId) { alert('Select patient and doctor first'); return; }
                    handleQueueCheckin(pId, dId);
                  }}
                  className="glow-btn w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Generate Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS TAB (DOCTOR) ─────────────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-5">
            <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <CalendarDays className="h-4 w-4 text-teal-600" />
                Today&apos;s Appointments
              </h2>

              {doctorAppointments.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">No appointments scheduled for you today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Time', 'Patient', 'Reason', 'Status', ''].map((h) => (
                          <th key={h} className={`pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide ${h === '' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {doctorAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-mono font-semibold text-slate-700 text-xs">
                            {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedPatientHistory(app.patient)}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              {app.patient?.name || 'Unknown'}
                            </button>
                            <span className="block text-xs text-slate-400 mt-0.5">Age: {app.patient?.age}</span>
                          </td>
                          <td className="py-3 text-slate-500">{app.reason || 'None'}</td>
                          <td className="py-3">
                            <span className={`badge ${app.status === 'COMPLETED' ? 'badge-teal' : app.status === 'CANCELLED' ? 'badge-rose' : 'badge-amber'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {app.status === 'PENDING' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const matchedDoc = doctorsList.find((d) => d.userId === user.id);
                                    handleQueueCheckin(app.patientId, matchedDoc.id, app.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 border border-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors"
                                >
                                  Check In
                                </button>
                                <button
                                  onClick={() => handleCompleteAppointment(app.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-600 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition-colors"
                                >
                                  Complete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Patient clinical record panel */}
            {selectedPatientHistory && (
              <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">{selectedPatientHistory.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedPatientHistory.gender} &nbsp;&middot;&nbsp; Contact: {selectedPatientHistory.phoneNumber}
                    </p>
                  </div>
                  <button onClick={() => setSelectedPatientHistory(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Clinical Background</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedPatientHistory.medicalHistory ?? (
                      <span className="italic text-slate-400">No medical history on record.</span>
                    )}
                  </p>
                </div>

                <Link
                  href={`/patients/${selectedPatientHistory.id}/history-records`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
                >
                  View full diagnostic records
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── QUEUE TAB (DOCTOR) ────────────────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-600" />
                Active Queue Controller
              </h2>
              <p className="text-xs text-slate-500 mt-1">Manage patient call sequences for the live monitor board.</p>
            </div>

            {doctorQueue.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">No patients in the queue today.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                      t.status === 'CALLING'
                        ? 'border-teal-200 bg-teal-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-800">#{t.tokenNumber}</span>
                      <span className={`badge ${t.status === 'CALLING' ? 'badge-teal' : t.status === 'COMPLETED' ? 'badge-slate' : 'badge-amber'}`}>
                        {t.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.patient.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.patient.phoneNumber}</p>
                    </div>

                    <div className="flex gap-2">
                      {t.status === 'WAITING' && (
                        <button
                          onClick={() => handleUpdateQueueStatus(t.id, 'CALLING')}
                          className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Call Patient
                        </button>
                      )}
                      {t.status === 'CALLING' && (
                        <>
                          <button
                            onClick={() => handleUpdateQueueStatus(t.id, 'COMPLETED')}
                            className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Consulted
                          </button>
                          <button
                            onClick={() => handleUpdateQueueStatus(t.id, 'SKIPPED')}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB (ADMIN) ────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Doctor Revenue Report
                </h2>
                <p className="text-xs text-slate-500 mt-1">System-wide practitioner performance. Computes completed bookings and revenue.</p>
              </div>
              <button
                onClick={generateSystemReport}
                disabled={adminReportLoading}
                className="glow-btn shrink-0 flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${adminReportLoading ? 'animate-spin' : ''}`} />
                {adminReportLoading ? 'Loading…' : 'Load Report'}
              </button>
            </div>

            {adminReportLoading ? (
              <div className="flex flex-col items-center py-14 gap-4">
                <div className="pulse-loader"><div /><div /></div>
                <p className="text-sm text-slate-400 animate-pulse">Aggregating data…</p>
              </div>
            ) : !adminReportData ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-sm text-slate-400">
                Click Load Report above to generate the audit. Warning: slow on large doctor tables.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  API resolved in <strong className="text-amber-700">{adminReportData.timeTakenMs} ms</strong>. Optimize with Promise.all or a single join aggregate.
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Total Physicians', value: adminReportData.data.length, color: '' },
                    { label: 'Total Appointments', value: adminReportData.data.reduce((s, i) => s + i.totalAppointments, 0), color: '' },
                    { label: 'Total Revenue', value: `$${adminReportData.data.reduce((s, i) => s + i.revenue, 0)}`, color: 'text-teal-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                      <p className={`text-2xl font-black mt-1 text-slate-800 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Doctor', 'Department', 'Consultations', 'Queue Today', 'Revenue'].map((h, i) => (
                          <th key={h} className={`pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide ${i >= 2 ? 'text-center' : ''} ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {adminReportData.data.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-medium text-slate-800">
                            {item.name}
                            <span className="block text-xs text-teal-600 font-medium mt-0.5">{item.specialization}</span>
                          </td>
                          <td className="py-3 text-slate-500">{item.department}</td>
                          <td className="py-3 text-center text-slate-500 text-xs">
                            {item.completedAppointments} / {item.totalAppointments}
                          </td>
                          <td className="py-3 text-center font-medium text-slate-700">{item.todayQueueSize}</td>
                          <td className="py-3 text-right font-semibold text-teal-700">${item.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PHYSICIANS TAB (ADMIN) ────────────────────────────────────────────── */}
        {activeTab === 'physicians' && (
          <div className="glass rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Award className="h-4 w-4 text-teal-600" />
                Physician Registry
              </h2>
              <p className="text-xs text-slate-500 mt-1">Database lookup. Uses raw SQL interpolation on the backend.</p>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Search physician name…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:border-teal-500 transition-colors"
                />
              </div>
              <button
                onClick={searchPhysiciansAdmin}
                className="glow-btn px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Search
              </button>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <strong>SQL Injection Risk:</strong> This endpoint executes raw interpolation:
                <code className="block mt-1.5 px-2.5 py-1.5 bg-rose-100 rounded-lg font-mono text-rose-800">
                  SELECT * FROM &quot;Doctor&quot; WHERE name ILIKE &apos;%&#123;query&#125;%&apos;
                </code>
                Inject standard SQL strings to leak full user login lists.
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctorsList.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-sm">
                  <div>
                    <span className="badge badge-teal mb-2 inline-flex">{doc.department}</span>
                    <h4 className="font-semibold text-slate-800">{doc.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{doc.specialization}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">{doc.experience} yrs exp</span>
                    <span className="font-semibold text-teal-700">${doc.consultationFee} fee</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
