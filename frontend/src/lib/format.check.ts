// Tiny assertions for format.ts (no test runner in the frontend yet).
// Run: pnpm --filter frontend check:format
import { strictEqual } from "node:assert/strict";
import { formatBps, formatCountdown, formatMusd, formatSeconds, musdToInput, parseMusd, shortAddress } from "./format";

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);

strictEqual(formatMusd(musd(1234, 500_000)), "1,234.5 mUSD");
strictEqual(formatMusd(musd(1000)), "1,000 mUSD");
strictEqual(formatMusd(BigInt(0)), "0 mUSD");
strictEqual(formatMusd(musd(42, 999_999)), "42.99 mUSD"); // truncated, never rounded up
strictEqual(formatMusd(musd(42, 999_999), { decimals: 6 }), "42.999999 mUSD");
strictEqual(formatMusd(musd(42, 120_000), { decimals: 0 }), "42 mUSD");
strictEqual(formatMusd(musd(1_234_567), { unit: false }), "1,234,567");
strictEqual(formatMusd(-musd(12, 340_000)), "-12.34 mUSD");

strictEqual(parseMusd("1,234.5"), musd(1234, 500_000));
strictEqual(parseMusd("10"), musd(10));
strictEqual(parseMusd(".5"), musd(0, 500_000));
strictEqual(parseMusd("0.000001"), BigInt(1));
strictEqual(parseMusd("0.0000001"), null);
strictEqual(parseMusd("abc"), null);
strictEqual(parseMusd(""), null);
strictEqual(parseMusd("."), null);
strictEqual(parseMusd("-5"), null);
strictEqual(musdToInput(musd(1234, 500_000)), "1234.5");

strictEqual(formatBps(42), "+0.42%");
strictEqual(formatBps(-150), "-1.50%");
strictEqual(formatBps(0), "0.00%");
strictEqual(formatBps(17_520_000), "+175,200.00%");

strictEqual(formatCountdown(545), "09:05");
strictEqual(formatCountdown(0), "00:00");
strictEqual(formatCountdown(-3), "00:00");
strictEqual(formatCountdown(59.9), "00:59");
strictEqual(formatCountdown(3725), "1:02:05");
strictEqual(formatSeconds(87), "87s");

strictEqual(shortAddress("0x1234567890abcdef1234567890abcdef123456ab"), "0x12…ab");

console.log("format.ts: all checks passed");
