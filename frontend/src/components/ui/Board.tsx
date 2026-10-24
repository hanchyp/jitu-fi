import type { ElementType, ReactNode } from "react";

type BoardProps = {
  children: ReactNode;
  /** "night" is the section panel; "raised" is the hero board / feature card on navy. */
  tone?: "night" | "raised";
  /** Quest-style tilt on md+ screens. Use sparingly: one tilted card per row at most. */
  tilt?: "left" | "right";
  as?: ElementType;
  className?: string;
};

const TONES = {
  night: "bg-malam shadow-[0_6px_0_0_#040B10]",
  raised: "bg-papan shadow-[0_8px_0_0_#040B10]",
} as const;

const TILTS = { left: "md:-rotate-2", right: "md:rotate-1" } as const;

/** The landing's section panel: navy board, 3 px ink outline, hard bottom shadow. */
export function Board({ children, tone = "night", tilt, as: Tag = "div", className = "" }: BoardProps) {
  return (
    <Tag
      className={`rounded-[22px] border-[3px] border-garis p-5 sm:p-6 ${TONES[tone]} ${tilt ? TILTS[tilt] : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
