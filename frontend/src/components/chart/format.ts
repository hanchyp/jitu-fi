// Chart-only number formatting, en-US: prices and a bps label, which @/lib/format lacks.
// Returns are integer bps, as in the game rules.

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

const BPS = new Intl.NumberFormat("en-US", { signDisplay: "exceptZero", maximumFractionDigits: 0 });

/** "+42 bps". For percent ("+0.42%") use formatBps from @/lib/format. */
export function formatBps(bps: number) {
  return `${BPS.format(Math.round(bps))} bps`;
}
