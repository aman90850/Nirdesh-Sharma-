import React, { useState } from 'react';
import { X } from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '../services/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Returns an error message, or null when the password was changed. */
  onSubmit: (current: string, next: string) => Promise<string | null>;
}

export const ChangePasswordModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (next === current) {
      setError('Choose a password different from the current one.');
      return;
    }
    setBusy(true);
    const result = await onSubmit(current, next);
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    close();
  };

  const field =
    'w-full rounded-md border border-[#CBD2C9] bg-white px-3 py-2.5 text-[15px] text-slate-900';

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-[#DCE1DA] bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 id="cp-title" className="font-display text-xl font-bold text-[#1E2B4D]">Change password</h2>
          <button type="button" onClick={close} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Current password</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">New password</span>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Type new password again</span>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} required />
          </label>
          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-md border border-[#DCE1DA] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-md bg-[#128041] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0E6A35] disabled:opacity-60 cursor-pointer">
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
};
