import { formatMusd } from "@/lib/format";

type WeightMeterProps = {
  /** The amount typed, in 6-decimal units (0 when empty or invalid). */
  principal: bigint;
  cap: bigint;
  /** Already locked in this season; the preview adds the new amount on top. */
  held?: bigint;
};

/** Live preview of the bonus weight, min(principal, cap), as a bar filling toward the cap. */
export function WeightMeter({ principal, cap, held }: WeightMeterProps) {
  const weight = principal < cap ? principal : cap;
  const capped = principal > cap;
  // Whole percent of the bar width only: display geometry, not money.
  const fill = cap > BigInt(0) ? Number((weight * BigInt(100)) / cap) : 0;

  return (
    <div className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-extrabold text-white/85">Bonus weight</p>
        <p className="font-extrabold text-white/70">
          <span className="font-display text-xl text-emas tabular-nums">{formatMusd(weight, { unit: false })}</span> of{" "}
          {formatMusd(cap)}
        </p>
      </div>
      <div
        className="mt-2 h-5 overflow-hidden rounded-[7px] border-[3px] border-garis bg-dasar"
        role="meter"
        aria-label="Bonus weight"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill}
        aria-valuetext={`${formatMusd(weight)} of ${formatMusd(cap)}`}
      >
        <div
          className="h-full bg-emas shadow-[inset_0_4px_0_0_rgb(255_255_255/0.25)] transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-bold text-white/60">
        {capped
          ? `Weight stops at ${formatMusd(cap)}. Every mUSD above it still earns base yield.`
          : "Your bonus share is season points times this weight."}
        {held !== undefined && held > BigInt(0) && ` Includes the ${formatMusd(held)} you already locked.`}
      </p>
    </div>
  );
}
