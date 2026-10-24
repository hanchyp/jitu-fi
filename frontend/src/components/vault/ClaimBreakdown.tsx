import type { ReactNode } from "react";
import { NetworkIcon } from "@/components/ui/icons";
import { formatMusd } from "@/lib/format";
import type { ClaimPayout } from "@/mocks/claim";

type ClaimBreakdownProps = {
  payout: ClaimPayout;
  /** The amount deposited, shown next to a principal repaid pro-rata. */
  deposited: bigint;
  /** Player's share of the bonus pot, integer bps. */
  bonusShareBps: number;
  shortfall?: boolean;
  /** Not mature yet: every figure is an estimate. */
  estimate?: boolean;
};

const ZERO = BigInt(0);

/** 168 -> "1.68%". A share, so no sign (formatBps is for returns). */
export function formatShare(bps: number) {
  const n = Math.max(0, Math.trunc(bps));
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}%`;
}

function Row({ marker, label, note, amount }: { marker: ReactNode; label: string; note: string; amount: bigint }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">{marker}</span>
      <div className="min-w-0 flex-1">
        <dt className="font-extrabold text-white">{label}</dt>
        <dd className="text-sm font-semibold leading-snug text-white/60">{note}</dd>
      </div>
      <dd className="font-display text-2xl text-white tabular-nums">{formatMusd(amount, { unit: false })}</dd>
    </div>
  );
}

// The loot bar's swatches: same fills as the landing's "Where the yield goes" bar.
const swatch = (fill: string) => (
  <span className={`h-7 w-7 rounded-[7px] border-[3px] border-garis ${fill} shadow-[inset_0_3px_0_0_rgb(255_255_255/0.25)]`} />
);

/**
 * Principal, base yield and bonus as rows, then the player's own loot bar (base | bonus) in the
 * landing's colors, so "where the yield goes" reads as "what you got". The total is not here: the
 * screen shows it as the focal number.
 */
export function ClaimBreakdown({ payout, deposited, bonusShareBps, shortfall = false, estimate = false }: ClaimBreakdownProps) {
  const loot = payout.baseYield + payout.bonus;
  const basePct = loot > ZERO ? Number((payout.baseYield * BigInt(10_000)) / loot) / 100 : 0;

  return (
    <div>
      <dl className="divide-y-[3px] divide-garis/60">
        <Row
          marker={<NetworkIcon className="h-9 w-9" />}
          label="Principal"
          note={
            shortfall
              ? `Repaid pro-rata: ${formatMusd(payout.principal)} of the ${formatMusd(deposited)} you deposited.`
              : estimate
                ? "Comes back from the Principal Crystal in full at maturity."
                : "Back from the Principal Crystal in full."
          }
          amount={payout.principal}
        />
        <Row
          marker={swatch("bg-langit")}
          label={estimate ? "Base yield (simulated)" : "Base yield"}
          note={shortfall ? "No yield this season, so there is no base yield." : "Shared by deposit size."}
          amount={payout.baseYield}
        />
        <Row
          marker={swatch("bg-emas")}
          label={estimate ? "Bonus (simulated)" : "Bonus"}
          note={
            shortfall
              ? `Sponsor funds only. Your share: ${formatShare(bonusShareBps)}.`
              : `Your share of the bonus pot: ${formatShare(bonusShareBps)}.`
          }
          amount={payout.bonus}
        />
      </dl>

      {loot > ZERO && (
        <div className="mt-4">
          <p className="text-sm font-extrabold text-white/70">Your loot</p>
          <div
            className="mt-1.5 flex h-8 w-full overflow-hidden rounded-[14px] border-[3px] border-garis shadow-[0_4px_0_0_#040B10]"
            role="img"
            aria-label={`${formatMusd(payout.baseYield)} base yield, ${formatMusd(payout.bonus)} bonus`}
          >
            {payout.baseYield > ZERO && (
              <div className="bg-langit shadow-[inset_0_5px_0_0_rgb(255_255_255/0.25)]" style={{ width: `${basePct}%` }} />
            )}
            {payout.bonus > ZERO && (
              <div
                className={`flex-1 bg-emas shadow-[inset_0_5px_0_0_rgb(255_255_255/0.25)] ${payout.baseYield > ZERO ? "border-l-[3px] border-garis" : ""}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
