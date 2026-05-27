'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LogOut, LayoutDashboard, MonitorPlay, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/queue', label: 'Live Queue', icon: MonitorPlay },
  ];

  const roleColors = {
    ADMIN: 'bg-violet-50 text-violet-700 border-violet-200',
    DOCTOR: 'bg-teal-50 text-teal-700 border-teal-200',
    RECEPTIONIST: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="p-1.5 bg-teal-600 rounded-lg group-hover:bg-teal-700 transition-colors">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-slate-800 tracking-tight text-base">HAQMS</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User area */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-sm font-semibold text-slate-700 leading-none">{user.name}</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${roleColors[user.role] || roleColors.RECEPTIONIST}`}>
              {user.role}
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
