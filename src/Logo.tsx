import React from "react";

interface LogoProps {
  className?: string;
}

/**
 * HardRecover Official Vector Logo (Suite Hard #2)
 * Matches Hardback's Squircle + Overlapping Dual Storage Plates aesthetic,
 * featuring the Surgical Recovery Pulse (Amber -> Cobalt Blue -> Emerald).
 */
export function HardRecoverLogo({ className = "w-8 h-8" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="hr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#21201D" />
          <stop offset="100%" stopColor="#141311" />
        </linearGradient>
        <linearGradient id="hr-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="hr-front-ssd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#323235" />
          <stop offset="100%" stopColor="#1C1C1E" />
        </linearGradient>
        <linearGradient id="hr-pulse-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="hr-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="-10"
            dy="16"
            stdDeviation="18"
            floodColor="#000000"
            floodOpacity="0.7"
          />
        </filter>
      </defs>

      {/* Squircle Background Canvas */}
      <rect width="1024" height="1024" rx="230" fill="url(#hr-bg)" />
      <rect
        x="16"
        y="16"
        width="992"
        height="992"
        rx="214"
        fill="none"
        stroke="url(#hr-rim)"
        strokeWidth="4"
      />

      {/* Back Storage Plate */}
      <rect
        x="290"
        y="210"
        width="530"
        height="420"
        rx="70"
        fill="#242426"
        stroke="#3A3A3D"
        strokeWidth="8"
      />
      <circle cx="755" cy="275" r="14" fill="#10B981" />
      <rect
        x="355"
        y="275"
        width="70"
        height="22"
        rx="6"
        fill="#10B981"
        fillOpacity="0.4"
      />
      <rect
        x="440"
        y="275"
        width="70"
        height="22"
        rx="6"
        fill="#3B82F6"
        fillOpacity="0.4"
      />
      <rect
        x="525"
        y="275"
        width="70"
        height="22"
        rx="6"
        fill="#F59E0B"
        fillOpacity="0.4"
      />

      {/* Front Storage Plate */}
      <rect
        x="200"
        y="380"
        width="530"
        height="420"
        rx="70"
        fill="url(#hr-front-ssd)"
        stroke="#454549"
        strokeWidth="8"
        filter="url(#hr-shadow)"
      />
      <circle cx="265" cy="445" r="12" fill="#F59E0B" />

      {/* Surgical Pulse & Restoration Wave */}
      <path
        d="M275 615 H365 L410 515 L465 695 L525 465 L575 615 H655"
        fill="none"
        stroke="url(#hr-pulse-grad)"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="655" cy="615" r="18" fill="#10B981" />
    </svg>
  );
}

export default HardRecoverLogo;

