import React, { useState } from 'react';
import { Download, MonitorDown, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isIOS ? 'Install App' : 'Install Desktop App'}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E2B4D] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Sigma USG as a standalone Desktop App"
      >
        {isInstallable ? <Download className="w-3.5 h-3.5 text-[#1E2B4D]" /> : <MonitorDown className="w-3.5 h-3.5 text-[#1E2B4D]" />}
        <span className="hidden xl:inline">{isIOS ? 'Install App' : 'Install Desktop App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Install as Desktop App (PWA)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Run Sigma Diagnostic and USG Center in its own Windows desktop window, offline-ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-700 list-decimal pl-5">
                <li>Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> to launch Sigma USG in standalone mode.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2.5 text-sm text-slate-700 list-decimal pl-5">
                <li>
                  Open this app directly in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> (outside any embedded preview frame).
                </li>
                <li>
                  Click the <strong>Install App</strong> icon on the right side of the browser address bar (or open Menu → <strong>Apps → Install this site as an app</strong>).
                </li>
                <li>
                  Pin the installed <strong>Sigma USG</strong> icon to your Windows Taskbar or Desktop—it opens like a native desktop application and supports full local folder auto-sync.
                </li>
              </ol>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg bg-[#1E2B4D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#142036] transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" />
      <span>Offline Mode — All billing and local folder data continue working locally.</span>
    </div>
  );
};
