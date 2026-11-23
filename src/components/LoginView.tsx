import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import type { ClinicSettings, EmployeeAccount } from '../types/clinic';
import { SigmaLogo } from './SigmaLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface LoginViewProps {
  settings: ClinicSettings;
  employees: EmployeeAccount[];
  onLogin: (account: EmployeeAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ settings, employees, onLogin }) => {
  const [username, setUsername] = useState('Sigmaadmin');
  const [password, setPassword] = useState('sigma1420');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = username.trim().toLowerCase();
    const matched = employees.find(
      (emp) =>
        (emp.emailOrUsername.toLowerCase() === normalized ||
          emp.empNo.toLowerCase() === normalized) &&
        emp.password === password
    );

    if (!matched) {
      setError('Invalid username or password. Check credentials under Manage Employee → View Account.');
      return;
    }
    onLogin(matched);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9]">
      {/* Minimal top strip for desktop install */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <SigmaLogo size={32} />
          <span className="font-display text-sm font-bold text-[#1E2B4D]">
            {settings.centerName}
          </span>
        </div>
        <PWAInstallButton />
      </div>

      {/* Centered Split Login Card (inspired by reference Sign In screen) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm grid grid-cols-1 md:grid-cols-12">
          {/* Left Clinical Brand Panel */}
          <div className="md:col-span-5 bg-[#1E2B4D] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="inline-flex rounded-xl bg-white/10 p-2.5 border border-white/15">
                <SigmaLogo size={64} />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold leading-snug tracking-tight text-white [text-wrap:balance]">
                {settings.centerName}
              </h1>
              {settings.tagline && (
                <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                  {settings.tagline}
                </p>
              )}
            </div>

            <div className="mt-10 pt-6 border-t border-white/15 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Offline Desktop Storage · Portable Folder Sync</span>
              </div>
              <p className="text-slate-400">
                Smart POS / A4 Receipt Printing · End-of-Day Closing Ledger · Role-Based Access Control
              </p>
            </div>
          </div>

          {/* Right Sign-In Form */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Welcome Back</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to continue to your USG &amp; Diagnostic Management System.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username / Email / Emp No
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2B4C8C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50/70 pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:border-[#2B4C8C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B4C8C]/15 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-100 text-xs text-slate-500">
              Default Admin login: <span className="font-mono font-semibold text-slate-700">Sigmaadmin</span> / <span className="font-mono font-semibold text-slate-700">sigma1420</span> (you can change password and add Operator accounts after signing in).
            </div>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-slate-500">
        {settings.centerName}{settings.address ? ` · ${settings.address}` : ''}
      </footer>
    </div>
  );
};
