import type { ReactNode } from "react";

type ChipTone = "gold" | "night";

const TONES: Record<ChipTone, string> = {
  gold: "bg-emas text-garis",
  night: "bg-dasar text-white/85",
};

/** Class string for chip-styled elements that are not a <span> (e.g. the dev-state links). */
export function chipClass(tone: ChipTone = "gold") {
  return `font-display inline-flex h-6 min-w-6 items-center justify-center rounded-[7px] border-2 border-garis px-1.5 text-sm leading-none ${TONES[tone]}`;
}

/** Small count or tag: the landing's pick-cap chip. */
export function Chip({ children, tone = "gold", className = "" }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  return <span className={`${chipClass(tone)} ${className}`}>{children}</span>;
}
