// Small hand-drawn game icons in the same outlined cartoon style as the title screen art.

const O = { stroke: "#0B1626", strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function ChestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M14 44 C14 22 82 22 82 44 Z" fill="#B66A2C" {...O} />
      <rect x="14" y="44" width="68" height="36" rx="5" fill="#C97A36" {...O} />
      <rect x="14" y="44" width="68" height="9" fill="#FFC93C" {...O} />
      <rect x="40" y="48" width="16" height="20" rx="4" fill="#FFC93C" {...O} />
      <circle cx="48" cy="58" r="3" fill="#0B1626" />
    </svg>
  );
}

export function CardsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <rect x="14" y="22" width="40" height="56" rx="7" fill="#2A5C9A" transform="rotate(-12 34 50)" {...O} />
      <rect x="42" y="20" width="40" height="56" rx="7" fill="#FFFFFF" transform="rotate(10 62 48)" {...O} />
      <path d="M62 34 L70 48 L54 48 Z" fill="#3DD68C" transform="rotate(10 62 48)" {...O} strokeWidth={3} />
      <path d="M54 56 L70 56 L62 68 Z" fill="#FF6B5E" transform="rotate(10 62 48)" {...O} strokeWidth={3} />
    </svg>
  );
}

export function CoinsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <ellipse cx="40" cy="70" rx="24" ry="9" fill="#E0A21E" {...O} />
      <ellipse cx="40" cy="62" rx="24" ry="9" fill="#FFC93C" {...O} />
      <ellipse cx="58" cy="52" rx="24" ry="9" fill="#E0A21E" {...O} />
      <ellipse cx="58" cy="44" rx="24" ry="9" fill="#FFC93C" {...O} />
      <ellipse cx="50" cy="30" rx="20" ry="20" fill="#FFC93C" {...O} />
      <path d="M50 20 L50 40 M43 26 L57 26 M43 34 L57 34" fill="none" {...O} strokeWidth={3} />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M48 12 L80 24 C80 52 68 72 48 84 C28 72 16 52 16 24 Z" fill="#3E9B4F" {...O} />
      <path d="M34 48 L44 58 L64 36" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoTicketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <rect x="14" y="30" width="68" height="36" rx="6" fill="#FFC93C" {...O} />
      <circle cx="14" cy="48" r="7" fill="#10213D" {...O} />
      <circle cx="82" cy="48" r="7" fill="#10213D" {...O} />
      <path d="M20 80 L76 16" stroke="#FF6B5E" strokeWidth={9} strokeLinecap="round" />
      <path d="M20 80 L76 16" stroke="#0B1626" strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    </svg>
  );
}

export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <path d="M28 18 L68 18 L66 46 C64 58 32 58 30 46 Z" fill="#FFC93C" {...O} />
      <path d="M28 24 C12 24 14 44 30 44 M68 24 C84 24 82 44 66 44" fill="none" {...O} />
      <rect x="42" y="56" width="12" height="12" fill="#E0A21E" {...O} />
      <rect x="30" y="68" width="36" height="12" rx="3" fill="#B66A2C" {...O} />
    </svg>
  );
}
