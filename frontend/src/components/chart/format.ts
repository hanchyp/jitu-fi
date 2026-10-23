// Chart number formatting, en-US. Returns are integer bps, as in the game rules.

/** Decimals that keep about 4–5 significant digits for small prices. */
function priceDecimals(price: number) {
  const abs = Math.abs(price);
  if (abs >= 1_000) return 2;
  if (abs >= 1) return 3;
  if (abs >= 0.01) return 4;
  return 6;
}

export function formatPrice(price: number) {
  const d = priceDecimals(price);
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/** Return from `from` to `to` in bps, unrounded. */
export function returnBps(from: number, to: number) {
  return from === 0 ? 0 : ((to - from) / from) * 10_000;
}

const signed = (digits: number) =>
  new Intl.NumberFormat("en-US", { signDisplay: "exceptZero", minimumFractionDigits: digits, maximumFractionDigits: digits });
const BPS = signed(0);
const PERCENT = signed(2);

/** "+42 bps" */
export function formatBps(bps: number) {
  return `${BPS.format(Math.round(bps))} bps`;
}

/** "+0.42%" from bps. */
export function formatBpsPercent(bps: number) {
  return `${PERCENT.format(Math.round(bps) / 100)}%`;
}
