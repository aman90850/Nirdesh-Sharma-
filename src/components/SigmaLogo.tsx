import React from 'react';

interface SigmaLogoProps {
  size?: number;
  className?: string;
}

export const SigmaLogo: React.FC<SigmaLogoProps> = ({ size = 44, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Sigma Diagnostic and USG Center emblem"
    >
      <circle cx="60" cy="60" r="56" fill="#FFFFFF" />
      <circle cx="60" cy="60" r="51" stroke="#16A34A" strokeWidth="5" />
      <circle cx="60" cy="60" r="43" stroke="#D97706" strokeWidth="2" strokeDasharray="4 3" />
      <path
        d="M80 35H40L62 60L40 85H80V76H54L71 60L54 44H80V35Z"
        fill="#1E2B4D"
      />
      <path d="M60 19V27M56 23H64" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};
