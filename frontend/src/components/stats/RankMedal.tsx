import Image from "next/image";

const PODIUM = ["bg-emas text-garis", "bg-gading text-garis", "bg-emas-tua text-garis"] as const;

/** Rank marker: medal art for the top 3 when it exists, else a numbered circle (gold, ivory, bronze for the podium). */
export function RankMedal({ rank, medal, className = "" }: { rank: number; medal?: string; className?: string }) {
  if (medal && rank <= 3) {
    return <Image src={medal} alt={`Rank ${rank}`} width={96} height={96} sizes="44px" className={`h-11 w-11 shrink-0 ${className}`} />;
  }
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-garis text-lg tabular-nums ${
        PODIUM[rank - 1] ?? "bg-dasar text-white/85"
      } ${className}`}
    >
      {rank}
    </span>
  );
}
