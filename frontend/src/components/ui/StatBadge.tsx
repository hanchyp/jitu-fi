import type { ReactNode } from "react";

type StatBadgeProps = {
  label: string;
  value: ReactNode;
  /** Optional one-line note under the value, e.g. "simulated". */
  hint?: string;
  className?: string;
};

/** Label over a gold display number, as in the landing's season stats. Renders its own <dl>. */
export function StatBadge({ label, value, hint, className = "" }: StatBadgeProps) {
  return (
    <dl className={`rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3 ${className}`}>
      <dt className="text-sm font-extrabold text-white/70">{label}</dt>
      <dd className="font-display mt-0.5 text-2xl text-emas">{value}</dd>
      {hint && <dd className="text-sm font-bold text-white/55">{hint}</dd>}
    </dl>
  );
}
