// Small outlined icons drawn to match the game style (UI_GUARDRAILS §6): thick round strokes, no icon library.
type IconProps = { className?: string };

export function CloseIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  );
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

/**
 * The Monad mark as the Principal Crystal: a thick squircle ring turned 45 degrees, as in the
 * landing's static backdrop. The one place kristal purple appears outside the 3D scene.
 */
export function NetworkIcon({ className = "h-24 w-24" }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={className}>
      <g transform="rotate(45 48 48)">
        <rect x="18" y="18" width="60" height="60" rx="23" fill="var(--color-kristal)" stroke="var(--color-garis)" strokeWidth={4} />
        <rect x="35" y="35" width="26" height="26" rx="10" fill="var(--color-malam)" stroke="var(--color-garis)" strokeWidth={4} />
        <path d="M27 50 V41 a14 14 0 0 1 14 -14 H50" fill="none" stroke="var(--color-kristal-terang)" strokeWidth={4} strokeLinecap="round" />
      </g>
    </svg>
  );
}
