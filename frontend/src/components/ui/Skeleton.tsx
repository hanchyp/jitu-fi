/**
 * A static placeholder block. It does not pulse: no idle loops (UI_GUARDRAILS §7).
 * Put one `label` on the loading region so screen readers hear what is loading.
 */
export function Skeleton({ className = "h-6 w-full", label }: { className?: string; label?: string }) {
  return (
    <div
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`rounded-[14px] border-[3px] border-garis/60 bg-white/10 ${className}`}
    />
  );
}
