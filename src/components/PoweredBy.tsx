import React from 'react';

export const PoweredBy: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`text-xs text-slate-400 ${className}`}>
    Powered by <span className="font-semibold text-slate-500">Aman Sharma</span>
  </span>
);
