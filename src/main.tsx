import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register offline-capable PWA service worker safely
try {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onRegisterError() {
        // Ignore service worker registration errors in restricted browsers/iframes
      },
    });
  }
} catch {
  // Continue rendering app normally even if SW is blocked
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h1 className="font-display text-lg font-bold text-slate-900">
              Sigma Diagnostic and USG Center
            </h1>
            <p className="text-sm text-slate-600">
              Something interrupted rendering: <span className="font-mono text-xs text-red-700">{this.state.message}</span>
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#2B4C8C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A70] cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
