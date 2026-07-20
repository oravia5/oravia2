import React from 'react';

export default function OraviaLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', color: 'currentColor' }}
    >
      {/* Outer orbit path */}
      <path
        d="M 50 14 A 36 36 0 1 1 50 86 A 36 36 0 1 1 50 14 Z"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
      />
      {/* Sphere 1: Top Right */}
      <circle cx="73" cy="27" r="9" fill="currentColor" />
      {/* Sphere 2: Bottom Right */}
      <circle cx="68" cy="72" r="7" fill="currentColor" />
      {/* Sphere 3: Left Middle */}
      <circle cx="26" cy="50" r="5" fill="currentColor" />
    </svg>
  );
}
