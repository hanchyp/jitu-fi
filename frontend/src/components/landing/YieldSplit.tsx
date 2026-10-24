import Image from "next/image";
import { formatMusd } from "@/lib/format";

// An illustrative season split, in mUSD's six-decimal token units.
const YIELD = BigInt(100_000_000);
const FEE = (YIELD * BigInt(15)) / BigInt(100);
const BASE = (YIELD - FEE) / BigInt(2);
const BONUS = YIELD - FEE - BASE;
const WEIGHT_CAP = BigInt(1_000_000_000);

const SHARES = [
  { name: "Platform fee", amount: FEE, fill: "fill-white/30", note: "Keeps the arena running." },
  {
    name: "Base yield",
    amount: BASE,
    fill: "fill-langit",
    note: "Shared by deposit size. Paid even if you lose every game.",
  },
  {
    name: "Bonus pot",
    amount: BONUS,
    fill: "fill-emas",
    note: `Shared by season points × deposit weight. Weight uses up to ${formatMusd(WEIGHT_CAP)} of your deposit. Sponsors can top up this pot.`,
  },
] as const;

/** Three physical loot vessels; color matches the claim breakdown's swatches. */
function LootVessel({ fill, fee }: { fill: string; fee: boolean }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="h-full w-full overflow-visible">
      <g stroke="var(--color-garis)" strokeWidth="3" strokeLinejoin="round">
        <path d="M15 61 25 86 50 94 75 86 85 61" className={fill} />
        <path d="m50 68 0 26 25-8 10-25" className="fill-garis/20" stroke="none" />
        <ellipse cx="50" cy="61" rx="35" ry="12" className={fill} />
        {!fee && (
          <g className="fill-emas">
            <ellipse cx="35" cy="45" rx="11" ry="6" transform="rotate(-25 35 45)" />
            <ellipse cx="58" cy="38" rx="11" ry="6" transform="rotate(20 58 38)" />
            <ellipse cx="69" cy="50" rx="11" ry="6" transform="rotate(-20 69 50)" />
          </g>
        )}
        <g className="fill-emas">
          <ellipse cx="40" cy="59" rx="11" ry="6" transform="rotate(15 40 59)" />
          <ellipse cx="61" cy="59" rx="11" ry="6" transform="rotate(-20 61 59)" />
        </g>
        <path d="M18 64 27 87 50 95 73 87 82 64" fill="none" />
        <path d="m44 76 6-3 6 3v10l-6 3-6-3Z" className="fill-gading" />
      </g>
    </svg>
  );
}

export function YieldSplit() {
  return (
    <div className="mt-8">
      <div className="grid gap-6 md:grid-cols-[0.85fr_1.4fr] md:gap-12">
        <div className="relative flex items-center justify-between gap-2 md:flex-col md:justify-center md:gap-0">
          <div>
            <p className="font-extrabold text-white/75">For every</p>
            <p className="font-display mt-1 whitespace-nowrap text-5xl leading-none text-gading sm:text-7xl">
              {formatMusd(YIELD, { unit: false })}
              {" "}
              <span className="ml-2 text-2xl">mUSD</span>
            </p>
            <p className="mt-2 text-sm font-bold text-white/70">of simulated season yield</p>
          </div>
          <Image
            src="/assets/landing/claim-treasure.webp"
            alt=""
            width={512}
            height={512}
            sizes="(min-width: 1024px) 288px, (min-width: 768px) 256px, 112px"
            className="h-28 w-28 shrink-0 md:mt-3 md:h-64 md:w-64 lg:h-72 lg:w-72"
          />
          {/* The chest feeds one trail, then branches into the three destinations. */}
          <span aria-hidden="true" className="absolute -right-12 top-1/2 hidden h-[3px] w-16 bg-emas md:block" />
        </div>

        <ul className="relative ml-3 border-l-[3px] border-emas py-1 md:ml-0">
          {SHARES.map((share, index) => (
            <li key={share.name} className={`relative pl-6 sm:pl-8 ${index > 0 ? "mt-6" : ""}`}>
              <span aria-hidden="true" className="absolute -left-[3px] top-12 h-[3px] w-7 bg-emas sm:w-9" />
              <div className="grid grid-cols-[64px_1fr] items-start gap-3 sm:grid-cols-[88px_1fr] sm:gap-5">
                <div className={`h-20 sm:h-24 ${index === 0 ? "px-1.5" : ""}`}>
                  <LootVessel fill={share.fill} fee={index === 0} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gading">{share.name}</h3>
                  <p className={`font-display mt-1 leading-none tabular-nums ${index === 0 ? "text-3xl text-white/80" : "text-4xl text-gading"}`}>
                    {formatMusd(share.amount, { unit: false })}
                    {" "}
                    <span className="ml-1.5 font-sans text-sm font-bold text-white/70">mUSD</span>
                  </p>
                  <p className="mt-2 max-w-md font-semibold leading-relaxed text-white/75">{share.note}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 border-t-[3px] border-garis pt-5 font-semibold leading-relaxed text-white/75">
        <strong className="text-gading">All paid at maturity.</strong> Games contest the bonus, never your principal.
        {" "}Principal stays in the vault strategy; strategy shortfalls can still affect repayment.
      </p>
    </div>
  );
}
