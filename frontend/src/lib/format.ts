// Display formatting for money, returns and timers. Money is always bigint in token units
// (mUSD has 6 decimals); returns and scores are integer basis points. No floats for money.

export const MUSD_DECIMALS = 6;

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 1234500000n -> "1,234.5 mUSD". Fractions are truncated (never rounded up) to `decimals`
 * digits and trailing zeros are dropped. `unit: false` leaves off the " mUSD" suffix.
 */
export function formatMusd(
  amount: bigint,
  { decimals = 2, unit = true }: { decimals?: number; unit?: boolean } = {},
): string {
  const negative = amount < BigInt(0);
  const abs = negative ? -amount : amount;
  const base = BigInt(10) ** BigInt(MUSD_DECIMALS);
  const whole = (abs / base).toString();
  const shown = Math.max(0, Math.min(decimals, MUSD_DECIMALS));
  const frac = (abs % base).toString().padStart(MUSD_DECIMALS, "0").slice(0, shown).replace(/0+$/, "");
  const text = `${negative ? "-" : ""}${group(whole)}${frac ? `.${frac}` : ""}`;
  return unit ? `${text} mUSD` : text;
}

/**
 * Parses what a player typed ("1,234.5", "10", ".5") into 6-decimal units.
 * Returns null for anything that is not a plain non-negative number or has more than 6 decimals.
 */
export function parseMusd(input: string): bigint | null {
  const text = input.replace(/,/g, "").trim();
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || text === "" || text === ".") return null;
  const [, whole = "", frac = ""] = match;
  if (frac.length > MUSD_DECIMALS) return null;
  return BigInt(whole || "0") * BigInt(10) ** BigInt(MUSD_DECIMALS) + BigInt(frac.padEnd(MUSD_DECIMALS, "0"));
}

/** Plain editable text for an amount, without grouping or unit: 1234500000n -> "1234.5". */
export function musdToInput(amount: bigint): string {
  return formatMusd(amount, { decimals: MUSD_DECIMALS, unit: false }).replace(/,/g, "");
}

/** 42 -> "+0.42%", -150 -> "-1.50%", 0 -> "0.00%". Input is integer basis points. */
export function formatBps(bps: number): string {
  const n = Math.trunc(bps);
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${group(String(Math.floor(abs / 100)))}.${String(abs % 100).padStart(2, "0")}%`;
}

/** 545 -> "09:05", 3725 -> "1:02:05". Negative or fractional input is clamped and floored. */
export function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
}

/** 87 -> "87s". For the short in-round timers. */
export function formatSeconds(seconds: number): string {
  return `${Math.max(0, Math.floor(seconds))}s`;
}

/** "0x1234…cdab" style short address: "0x12…ab". */
export function shortAddress(address: string): string {
  return address.length <= 8 ? address : `${address.slice(0, 4)}…${address.slice(-2)}`;
}
