import React, { useRef } from 'react';
import {
  CheckCircle2,
  Download,
  FolderOpen,
  FolderSync,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import type { ClinicDatabase } from '../types/clinic';
import { isFolderPickerSupported } from '../services/folderSync';

interface FolderSyncModalProps {
  open: boolean;
  db: ClinicDatabase;
  folderConnected: boolean;
  folderName: string | null;
  hasSavedFolderToResume: boolean;
  syncBusy: boolean;
  syncNotice: string | null;
  onConnectFolder: () => void;
  onResumeFolder: () => void;
  onSyncNow: () => void;
  onDisconnectFolder: () => void;
  onExportBundle: () => void;
  onImportBundle: (file: File) => void;
  onClose: () => void;
}

export const FolderSyncModal: React.FC<FolderSyncModalProps> = ({
  open,
  db,
  folderConnected,
  folderName,
  hasSavedFolderToResume,
  syncBusy,
  syncNotice,
  onConnectFolder,
  onResumeFolder,
  onSyncNow,
  onDisconnectFolder,
  onExportBundle,
  onImportBundle,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fsSupported = isFolderPickerSupported();

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Local PC Folder Sync &amp; Portable Data Transfer
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Keep all clinic records on this computer and move the synced folder to any other computer to auto-fetch and merge data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
            aria-label="Close folder sync modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Live Folder Auto-Sync Status</span>
              {folderConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected · {folderName}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500">Not Linked</span>
              )}
            </div>
            <div className="text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>Patients: <strong className="font-mono text-slate-900">{db.patients.length}</strong></div>
              <div>Doctors: <strong className="font-mono text-slate-900">{db.doctors.length}</strong></div>
              <div>Tests: <strong className="font-mono text-slate-900">{db.labTests.length}</strong></div>
              <div>Expenses: <strong className="font-mono text-slate-900">{db.expenses.length}</strong></div>
            </div>
            {db.settings.lastSyncedAt && (
              <div className="text-[11px] text-slate-500 pt-1">
                Last Synced: {new Date(db.settings.lastSyncedAt).toLocaleString()}
              </div>
            )}
          </div>

          {syncNotice && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
              {syncNotice}
            </div>
          )}

          {/* Direct Folder Link Section */}
          <div className="space-y-2.5">
            <h3 className="font-display text-xs font-bold text-slate-900 uppercase tracking-wide">
              1. Link Local Sync Folder (Recommended in Installed Desktop PWA)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Select a folder (e.g., <span className="font-mono">Sigma-USG-Data</span> on your PC, USB drive, or shared folder). The app automatically writes <span className="font-mono">sigma-usg-db.json</span> on every save. When you copy that folder to another PC and link it there, all records merge automatically.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {hasSavedFolderToResume && !folderConnected && (
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={onResumeFolder}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer disabled:opacity-50"
                >
                  <FolderSync className="w-3.5 h-3.5" />
                  <span>Resume Previously Linked Folder</span>
                </button>
              )}

              <button
                type="button"
                disabled={syncBusy || !fsSupported}
                onClick={onConnectFolder}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2B4D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#142036] cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{folderConnected ? 'Change Sync Folder' : 'Connect Local Folder'}</span>
              </button>

              {folderConnected && (
                <>
                  <button
                    type="button"
                    disabled={syncBusy}
                    onClick={onSyncNow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
                    <span>Sync &amp; Merge Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDisconnectFolder}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Unlink
                  </button>
                </>
              )}
            </div>
            {!fsSupported && (
              <p className="text-[11px] text-amber-700">
                Direct folder picker is unavailable in this browser/frame. Install the Desktop PWA in Chrome/Edge, or use the Portable Sync File options below.
              </p>
            )}
          </div>

          {/* Portable File Export / Import Fallback */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h3 className="font-display text-xs font-bold text-slate-900 uppercase tracking-wide">
              2. Portable Sync File (Works in Any Browser / USB Pendrive)
            </h3>
            <p className="text-xs text-slate-600">
              Download <span className="font-mono">sigma-usg-db.json</span> to copy to another computer, or import an existing file to safely merge newer/missing records into this PC.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBundle}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1E2B4D]" />
                <span>Export Sync File (.json)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImportBundle(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Import &amp; Merge Sync File</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
