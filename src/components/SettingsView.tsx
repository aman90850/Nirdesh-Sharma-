import { isValidUpiId } from '../utils/upi';
import React, { useState } from 'react';
import { FolderSync, Lock, Save } from 'lucide-react';
import type { ClinicSettings, PrinterMode, Role } from '../types/clinic';

interface SettingsViewProps {
  settings: ClinicSettings;
  userRole: Role;
  onSaveSettings: (updated: ClinicSettings) => void;
  onOpenFolderSync: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  userRole,
  onSaveSettings,
  onOpenFolderSync,
}) => {
  const [centerName, setCenterName] = useState(settings.centerName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [upiId, setUpiId] = useState(settings.upiId || '');
  const [regPrefix, setRegPrefix] = useState(settings.regPrefix);
  const [nextRegNumber, setNextRegNumber] = useState(String(settings.nextRegNumber));
  const [defaultPrinterMode, setDefaultPrinterMode] = useState<PrinterMode>(
    settings.defaultPrinterMode
  );
  const [centersText, setCentersText] = useState(settings.centers.join(', '));

  if (userRole !== 'Admin') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center max-w-lg mx-auto my-8">
        <Lock className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="mt-3 font-display text-lg font-bold text-slate-900">Admin Access Required</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Clinic branding, receipt prefix, and printer defaults can only be changed by an Admin.
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCenters = centersText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    onSaveSettings({
      ...settings,
      centerName: centerName.trim() || 'Sigma Diagnostic and USG Center',
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      upiId: upiId.trim(),
      regPrefix: regPrefix.trim().toUpperCase() || 'SIG',
      nextRegNumber: Math.max(1, Number(nextRegNumber) || settings.nextRegNumber),
      defaultPrinterMode,
      centers: parsedCenters.length > 0 ? parsedCenters : ['HEAD OFFICE'],
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-bold text-[#1E2B4D]">Clinic settings</h1>
          <p className="mt-1 text-[15px] text-slate-600">
            Name and address on receipts, bill numbering, printer and UPI.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenFolderSync}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <FolderSync className="w-3.5 h-3.5 text-[#1E2B4D]" />
          <span>Folder Sync Manager</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Center Name</label>
            <input
              type="text"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Services Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="upi-id" className="block text-xs font-semibold text-slate-700 mb-1">Clinic UPI ID (for pay-by-QR)</label>
            <input
              id="upi-id"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. sigmadiagnostic@okicici"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className={`mt-1 text-xs ${upiId && !isValidUpiId(upiId) ? 'text-red-600' : 'text-slate-500'}`}>
              {upiId && !isValidUpiId(upiId)
                ? 'This does not look like a UPI ID. It should look like name@bank.'
                : 'When set, the bill screen shows a QR for UPI payments, and receipts with a balance show a QR to pay it.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Receipt Printer Mode</label>
            <select
              value={defaultPrinterMode}
              onChange={(e) => setDefaultPrinterMode(e.target.value as PrinterMode)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="auto">Auto-Detect Printer (Smart POS / A4)</option>
              <option value="pos">80mm Thermal POS Receipt</option>
              <option value="a4">A4 Formal Clinic Invoice</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">USG Reg Prefix</label>
            <input
              type="text"
              value={regPrefix}
              onChange={(e) => setRegPrefix(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Next Registration Number</label>
            <input
              type="number"
              min="1"
              value={nextRegNumber}
              onChange={(e) => setNextRegNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pathology Centers (comma separated)
            </label>
            <input
              type="text"
              value={centersText}
              onChange={(e) => setCentersText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
