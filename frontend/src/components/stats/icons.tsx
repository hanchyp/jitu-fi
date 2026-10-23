// Outlined icons for the stats screens, drawn like components/ui/icons.tsx (thick round strokes).
export function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 6l4.5 4.5L12.5 6" />
    </svg>
  );
}
