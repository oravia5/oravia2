import React from 'react';

export default function OraviaLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id="oraviaLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb300" />
          <stop offset="50%" stopColor="#FF8F00" />
          <stop offset="100%" stopColor="#d84315" />
        </linearGradient>
      </defs>
      {/* Premium modern overlapping speech bubbles representing conversation/moments */}
      <path
        d="M17 11c0-3.31-2.69-6-6-6S5 7.69 5 11c0 1.09.29 2.11.8 2.99L5 17l3.21-.8c.81.51 1.76.8 2.79.8 3.31 0 6-2.69 6-6z"
        fill="url(#oraviaLogoGradient)"
        opacity="0.85"
      />
      <path
        d="M19 14.5c0-2.48-2.01-4.5-4.5-4.5a4.49 4.49 0 00-1.85.4c.53.79.85 1.74.85 2.77c0 2.27-1.5 4.18-3.53 4.77c.78.36 1.66.56 2.58.56c.77 0 1.49-.12 2.16-.35L19 19l-.8-2.61c.5-.59.8-1.35.8-1.89z"
        fill="url(#oraviaLogoGradient)"
      />
      {/* A connecting sparkle dot to link to the old identity */}
      <circle cx="17.5" cy="6.5" r="1.5" fill="#ffffff" />
    </svg>
  );
}
