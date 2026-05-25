export function EmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* circular soft backdrop */}
      <circle cx="125" cy="100" r="78" fill="#F1EFEC" />
      {/* paper */}
      <rect x="80" y="46" width="86" height="110" rx="6" fill="#FFFFFF" stroke="#E2E0DD" strokeWidth="1.5" />
      <rect x="92" y="62" width="48" height="8" rx="2" fill="#1A1A1A" />
      <rect x="92" y="80" width="62" height="3" rx="1.5" fill="#E2E0DD" />
      <rect x="92" y="90" width="50" height="3" rx="1.5" fill="#E2E0DD" />
      <rect x="92" y="100" width="58" height="3" rx="1.5" fill="#E2E0DD" />
      <rect x="92" y="110" width="44" height="3" rx="1.5" fill="#E2E0DD" />
      {/* small floating tag */}
      <rect x="160" y="40" width="36" height="14" rx="3" fill="#FFFFFF" stroke="#E2E0DD" />
      <rect x="166" y="46" width="20" height="2" rx="1" fill="#BDBDBD" />
      {/* magnifier */}
      <circle cx="146" cy="118" r="28" fill="#FFFFFF" stroke="#BDBDBD" strokeWidth="3" />
      <line x1="166" y1="138" x2="184" y2="156" stroke="#9A9A9A" strokeWidth="4" strokeLinecap="round" />
      {/* red X inside lens */}
      <path d="M134 106l24 24M158 106l-24 24" stroke="#C0382E" strokeWidth="5" strokeLinecap="round" />
      {/* decorative scribbles */}
      <path d="M62 62c-6-12 4-22 18-14" stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M196 96c2 4 8 4 10 0" stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M78 158l-3 6m6-3l-6 3" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
      {/* sparkle */}
      <path d="M70 132l3 4 4 3-4 3-3 4-3-4-4-3 4-3z" fill="#BDBDBD" />
      <circle cx="186" cy="142" r="2" fill="#3B82F6" />
    </svg>
  );
}
