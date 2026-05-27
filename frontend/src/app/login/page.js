'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Activity, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function Login() {
  const { login, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const emailRegex = /^[^\s@]+@[^\s@]+$/;
    if (!email) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email format.');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setValidationError(result.error || 'Invalid credentials');
    }
  };

  const displayError = validationError || authError;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-bg px-4 py-12">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="p-2 bg-teal-600 rounded-xl shadow-md group-hover:bg-teal-700 transition-colors">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tight">HAQMS</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-2xl shadow-lg border border-slate-200 overflow-hidden">

        {/* Card header */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Access your staff portal account</p>
        </div>

        {/* Form body */}
        <div className="px-7 py-6 space-y-5">
          {displayError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {displayError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@haqms.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:border-teal-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        {/* Demo credentials */}
        <div className="px-7 pb-7">
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Demo accounts</p>
            <div className="space-y-1.5">
              {[
                { label: 'Admin', email: 'admin@haqms.com', password: 'password123' },
                { label: 'Receptionist', email: 'reception1@haqms.com', password: 'password123' },
                { label: 'Doctor', email: 'doctor1@haqms.com', password: 'password123' },
              ].map(({ label, email: e, password: p }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setEmail(e); setPassword(p); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-xs font-medium transition-colors"
                >
                  <span className="font-semibold text-slate-500">{label}</span>
                  <span className="text-slate-400 ml-1.5">{e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
