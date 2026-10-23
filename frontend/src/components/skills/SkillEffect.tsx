import type { SkillName } from "./types";

/** Lightweight DOM effect for the 2D scene and table UI; 3D callers can use the same skill name. */
export function SkillEffect({ skill, className = "" }: { skill: SkillName; className?: string }) {
  const glyph: Record<SkillName, string> = { BOOST: "↑", INSURANCE: "✦", LOCK: "▣", FLIP: "↻", SWAP: "⇄", FREEZE: "❄" };
  return (
    <span aria-label={`${skill} active`} className={`skill-effect skill-effect-${skill.toLowerCase()} ${className}`}>
      <span aria-hidden>{glyph[skill]}</span>
    </span>
  );
}
