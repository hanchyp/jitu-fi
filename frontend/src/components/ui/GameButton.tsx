import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "gold" | "night";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-emas text-garis shadow-[0_5px_0_0_#6B3F00] hover:bg-[#FFD666] active:shadow-[0_1px_0_0_#6B3F00]",
  night: "bg-malam text-white shadow-[0_5px_0_0_#050B14] hover:bg-[#162C50] active:shadow-[0_1px_0_0_#050B14]",
};

const SIZES = {
  sm: "px-4 py-1.5 text-base",
  md: "px-5 py-2.5 text-lg",
  lg: "px-4 py-2.5 text-lg sm:px-7 sm:py-3.5 sm:text-2xl",
} as const;

type Style = { variant?: Variant; size?: keyof typeof SIZES; className?: string };

// Chunky title-screen button: heavy outline plus a solid bottom bevel that collapses on press.
function gameButtonClass({ variant = "gold", size = "md", className }: Style) {
  return `font-display inline-block whitespace-nowrap rounded-[14px] border-[3px] border-garis tracking-wide transition-[transform,box-shadow,background-color] duration-100 hover:-translate-y-0.5 active:translate-y-1 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ""}`;
}

export function GameButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link {...props} className={gameButtonClass({ variant, size, className })} />;
}

export function GameActionButton({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & Style) {
  return <button type={type} {...props} className={gameButtonClass({ variant, size, className })} />;
}
