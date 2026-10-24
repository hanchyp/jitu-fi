import Image from "next/image";

const PODIUM = ["bg-emas text-garis", "bg-gading text-garis", "bg-emas-tua text-garis"] as const;

/** Medal art, with numbered fallback; podium callers also show a visible rank below it. */
export function RankMedal({ rank, medal, size = "row", className = "" }: { rank: number; medal?: string; size?: "row" | "podium"; className?: string }) {
  const dimensions = size === "podium" ? "h-20 w-20 sm:h-28 sm:w-28" : "h-11 w-11";
  if (medal && rank <= 3) {
    return (
      <Image
        src={medal}
        alt={`Rank ${rank}`}
        width={256}
        height={256}
        sizes={size === "podium" ? "(min-width: 640px) 112px, 80px" : "44px"}
        className={`shrink-0 object-contain ${dimensions} ${className}`}
      />
    );
  }
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`font-display flex shrink-0 items-center justify-center rounded-full border-[3px] border-garis text-2xl tabular-nums ${dimensions} ${
        PODIUM[rank - 1] ?? "bg-dasar text-white/85"
      } ${className}`}
    >
      {rank}
    </span>
  );
}
