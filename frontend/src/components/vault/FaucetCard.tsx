import { Countdown } from "@/components/ui/Countdown";
import { GameActionButton } from "@/components/ui/GameButton";
import { formatMusd } from "@/lib/format";

type FaucetCardProps = {
  balance: bigint;
  amount: bigint;
  /** Seconds left on the cooldown; 0 means the faucet can be claimed. */
  cooldownLeft: number;
  pending?: boolean;
  /** Blocks the claim while another wallet action (the deposit) is pending. */
  busy?: boolean;
  onClaim: () => void;
  /** The cooldown ran out while the page was open. */
  onReady: () => void;
};

/** Test mUSD for the demo: the wallet balance and a once-an-hour 1,000 mUSD claim. */
export function FaucetCard({ balance, amount, cooldownLeft, pending = false, busy = false, onClaim, onReady }: FaucetCardProps) {
  const coolingDown = cooldownLeft > 0;
  return (
    <section id="faucet" aria-labelledby="faucet-title" className="scroll-mt-24 rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h2 id="faucet-title" className="text-sm font-extrabold text-white/70">
            Wallet balance
          </h2>
          <p className="font-display text-2xl text-emas tabular-nums">{formatMusd(balance)}</p>
        </div>
        <GameActionButton variant="night" size="sm" onClick={onClaim} disabled={pending || busy || coolingDown}>
          {pending ? "Minting" : `Claim ${formatMusd(amount, { unit: false })} mUSD`}
        </GameActionButton>
      </div>
      {coolingDown ? (
        <Countdown seconds={cooldownLeft} label="Faucet ready again in" ticking onDone={onReady} className="mt-2 text-sm" />
      ) : (
        <p className="mt-2 text-sm font-bold text-white/55">Test mUSD from the faucet, once an hour. It has no real value.</p>
      )}
    </section>
  );
}
