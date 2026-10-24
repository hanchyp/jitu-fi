import type { ElementType, ReactNode } from "react";

type TileProps = {
  children: ReactNode;
  /** "papan" for regular tiles, "dasar" for skills. */
  tone?: "papan" | "dasar";
  /** Selected or current tile: lifts to papan-terang. */
  active?: boolean;
  as?: ElementType;
  className?: string;
};

/** A tile inside a board (presets, skills, list rows). */
export function Tile({ children, tone = "papan", active = false, as: Tag = "div", className = "" }: TileProps) {
  const fill = active ? "bg-papan-terang" : tone === "dasar" ? "bg-dasar" : "bg-papan";
  return <Tag className={`rounded-[14px] border-[3px] border-garis px-3 py-2 ${fill} ${className}`}>{children}</Tag>;
}
