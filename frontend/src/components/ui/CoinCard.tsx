import type { ReactNode } from "react";
import { formatBps } from "@/lib/format";
import { coinDataUrl, type Coin } from "@/lib/coins";

type CoinCardProps = {
  coin: Coin;
  /** Preformatted price, e.g. "$67,420.15". */
  price?: string;
  /** Move this round, integer bps. Colored Buy green / Sell coral. */
  changeBps?: number;
  /** The call on this coin once picked. */
  side?: "buy" | "sell";
  /** Picked this round: gold ring and lighter tile. */
  selected?: boolean;
  /** Can't be picked (cap reached, phase over). */
  disabled?: boolean;
  /** Makes the card a toggle button. Without it the card is static. */
  onSelect?: () => void;
  /** Slot under the price, e.g. a sparkline. */
  children?: ReactNode;
  className?: string;
};

/** A coin on the table: official logo in a ring of its brand color, symbol, price and move. */
export function CoinCard({ coin, price, changeBps, side, selected = false, disabled = false, onSelect, children, className = "" }: CoinCardProps) {
  const body = (
    <>
      <span className="flex items-center gap-2.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-garis"
          style={{ backgroundColor: coin.rim }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL, nothing to optimize */}
          <img src={coinDataUrl(coin)} alt="" width={32} height={32} className="h-8 w-8 rounded-full border-2 border-garis" />
        </span>
        <span className="min-w-0 text-left">
          <span className="font-display block text-xl leading-tight text-white">{coin.symbol}</span>
          <span className="block truncate text-sm font-bold text-white/60">{coin.name}</span>
        </span>
      </span>
      {/* The call hangs on the top edge like a tag, so it never squeezes the coin name. */}
      {side && (
        <span
          className={`font-display absolute -top-3 right-2 rounded-[7px] border-2 border-garis px-1.5 text-sm text-garis ${side === "buy" ? "bg-naik" : "bg-turun"}`}
        >
          {side === "buy" ? "Buy" : "Sell"}
        </span>
      )}
      {(price || changeBps !== undefined) && (
        <span className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
          {price && <span className="font-extrabold text-white/85 tabular-nums">{price}</span>}
          {changeBps !== undefined && (
            <span
              className={`font-extrabold tabular-nums ${changeBps > 0 ? "text-naik" : changeBps < 0 ? "text-turun" : "text-white/60"}`}
            >
              {formatBps(changeBps)}
            </span>
          )}
        </span>
      )}
      {children}
    </>
  );

  const look = `relative block w-full rounded-[14px] border-[3px] border-garis px-3 py-2.5 ${
    selected ? "bg-papan-terang ring-[3px] ring-emas" : "bg-papan"
  } ${disabled ? "opacity-45" : ""} ${className}`;

  if (!onSelect) return <div className={look}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`${look} shadow-[0_4px_0_0_#040B10] transition-[transform,box-shadow] duration-100 hover:bg-papan-terang active:translate-y-1 active:shadow-[0_1px_0_0_#040B10] disabled:pointer-events-none`}
    >
      {body}
    </button>
  );
}
