import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import type { ClinicSettings, EmployeeAccount } from '../types/clinic';
import { SigmaLogo } from './SigmaLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { PoweredBy } from './PoweredBy';
import { ThemeToggle } from './ThemeToggle';
import {
  clearFailedLogins,
  getLockRemainingSeconds,
  recordFailedLogin,
  verifyPassword,
} from '../services/auth';

interface LoginViewProps {
  settings: ClinicSettings;
  employees: EmployeeAccount[];
  onLogin: (account: EmployeeAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ settings, employees, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setError('');

    const wait = getLockRemainingSeconds();
    if (wait > 0) {
      setError(`Too many wrong attempts. Please wait ${wait} seconds and try again.`);
      return;
    }

    setChecking(true);
    try {
      const normalized = username.trim().toLowerCase();
      const candidates = employees.filter(
        (emp) =>
          emp.emailOrUsername.toLowerCase() === normalized ||
          emp.empNo.toLowerCase() === normalized
      );
      let matched: EmployeeAccount | null = null;
      for (const emp of candidates) {
        if (await verifyPassword(password, emp.password)) {
          matched = emp;
          break;
        }
      }

      if (!matched) {
        recordFailedLogin();
        setError('Invalid username or password.');
        return;
      }
      clearFailedLogins();
      setPassword('');
      onLogin(matched);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F0]">
      <div className="flex items-center justify-end gap-2.5 px-6 py-4">
        <ThemeToggle />
        <PWAInstallButton />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[880px] overflow-hidden rounded-xl border border-[#DCE1DA] bg-white grid grid-cols-1 md:grid-cols-[1fr_1.15fr]">
          {/* Clinic panel */}
          <div className="brand-panel bg-[#1E2B4D] p-8 sm:p-10 text-white flex flex-col justify-between gap-10">
            <div>
              <SigmaLogo size={72} />
              <h1 className="mt-7 font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">
                {settings.centerName}
              </h1>
              <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-slate-300">
                {settings.tagline || 'Billing, receipts and the daily till for the USG and X-ray desk.'}
              </p>
            </div>
            <p className="flex items-start gap-2 text-sm text-slate-300">
              <ShieldCheck className="mt-0.5 w-4 h-4 text-[#3DD07A] shrink-0" />
              <span>{'Your clinic data stays on this computer. Passwords are stored encrypted.'}</span>
            </p>
          </div>

          {/* Sign-in form */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <h2 className="font-display text-[1.6rem] font-bold text-[#1E2B4D]">{'Sign in'}</h2>
            <p className="mt-1 text-[15px] text-slate-600">
              {'Use the Admin or User login given to you by the clinic.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {'Username'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={'Enter username'}
                    autoComplete="username"
                    className="w-full rounded-md border border-[#CBD2C9] bg-white pl-10 pr-3.5 py-3 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none focus:ring-2 focus:ring-[#1E2B4D]/15 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={'Enter password'}
                    autoComplete="current-password"
                    className="w-full rounded-md border border-[#CBD2C9] bg-white pl-10 pr-10 py-3 text-sm text-slate-900 focus:border-[#1E2B4D] focus:outline-none focus:ring-2 focus:ring-[#1E2B4D]/15 transition-colors"
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
                disabled={checking}
                className="w-full rounded-md bg-[#128041] px-4 py-3 text-[15px] font-semibold text-white hover:bg-[#0E6A35] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {checking ? 'Checking…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="py-5 text-center text-sm text-slate-500 space-y-0.5">
        <div>{settings.centerName}{settings.address ? ` · ${settings.address}` : ''}</div>
        <PoweredBy />
      </footer>
    </div>
  );
};
