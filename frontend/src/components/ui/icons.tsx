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

/** A small crystal for the wrong-network board: the Monad mark is the one place purple is allowed. */
export function NetworkIcon({ className = "h-14 w-14" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <rect x="11" y="11" width="26" height="26" rx="9" transform="rotate(45 24 24)" fill="var(--color-kristal)" stroke="var(--color-garis)" strokeWidth={3} />
      <rect x="18.5" y="18.5" width="11" height="11" rx="3.5" transform="rotate(45 24 24)" fill="var(--color-malam)" stroke="var(--color-garis)" strokeWidth={2.5} />
    </svg>
  );
}
