import type { SVGProps } from "react";

/**
 * Inline icons. Deliberately not an icon package — this is the entire set the
 * app needs, and it keeps the client bundle free of a 300KB dependency.
 */
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

type IconProps = SVGProps<SVGSVGElement>;

export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3.25 3.25 0 0 1 0 6.3M17.5 20a5.6 5.6 0 0 0-2.2-4.4" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M6.7 17.3 5 19M19 5l-1.7 1.7" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const FlameIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9.4 9 7.6 9 7.6s.5 2 1.6 2C12 9.6 12 6.6 12 3Z" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 7" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5.2-2 6.8-2 6.8h16S18 14.2 18 9Z" />
    <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.6V20h12V9.6" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </svg>
);

export const HistoryIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.4" />
    <path d="M3.5 4v4.6h4.6M12 7.5V12l3 1.8" />
  </svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <svg {...base} {...p} className={`animate-spin ${p.className ?? ""}`}>
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
  </svg>
);
