import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "gold" | "night";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-emas text-garis shadow-[0_5px_0_0_#6B3F00] hover:bg-[#FFD666] active:shadow-[0_1px_0_0_#6B3F00]",
  night: "bg-malam text-white shadow-[0_5px_0_0_#050B14] hover:bg-[#162C50] active:shadow-[0_1px_0_0_#050B14]",
};

const SIZES = {
  md: "px-5 py-2.5 text-lg",
  lg: "px-4 py-2.5 text-lg sm:px-7 sm:py-3.5 sm:text-2xl",
} as const;

type GameButtonProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
};

// Chunky title-screen button: heavy outline plus a solid bottom bevel that collapses on press.
export function GameButton({ variant = "gold", size = "md", className, ...props }: GameButtonProps) {
  return (
    <Link
      {...props}
      className={`font-display inline-block whitespace-nowrap rounded-[14px] border-[3px] border-garis tracking-wide transition-[transform,box-shadow,background-color] duration-100 hover:-translate-y-0.5 active:translate-y-1 ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ""}`}
    />
  );
}
