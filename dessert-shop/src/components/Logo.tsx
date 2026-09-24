/** Brand mark: a basbousa tray cut into diamonds, each with an almond. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#2c5b4c" />
      <rect x="8" y="11" width="24" height="18" rx="3" fill="#f3d9a4" />
      {/* Nested <svg> clips the diamond cuts to the tray without needing a unique clipPath id. */}
      <svg x="8" y="11" width="24" height="18" viewBox="8 11 24 18" overflow="hidden">
        <g stroke="#c9974a" strokeWidth="1.3">
          <path d="M2 29 20 11M11 29 29 11M20 29 38 11M-7 29 11 11" />
          <path d="M2 11l18 18M11 11l18 18M20 11l18 18M-7 11l18 18" />
        </g>
      </svg>
      <g fill="#fff8ea">
        <ellipse cx="15.5" cy="15.5" rx="1.3" ry="0.8" />
        <ellipse cx="24.5" cy="15.5" rx="1.3" ry="0.8" />
        <ellipse cx="20" cy="20" rx="1.3" ry="0.8" />
        <ellipse cx="15.5" cy="24.5" rx="1.3" ry="0.8" />
        <ellipse cx="24.5" cy="24.5" rx="1.3" ry="0.8" />
      </g>
    </svg>
  );
}
