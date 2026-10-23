"use client";

// The moment a rival's skill lands on one of your picks (today only FREEZE can): a toast that names
// the caster and the pick. The spell itself plays on the spirit in <TableScene>.

import { Toast } from "@/components/ui/Toast";
import { formatBps } from "@/components/table-scene/model";
import type { CoinSymbol } from "@/components/table-scene/types";

export type IncomingSkill = {
  casterName: string;
  symbol: CoinSymbol;
  /** Your pick's signed return when the freeze landed; it stays there for the rest of the round. */
  heldBps: number;
};

export function IncomingSkillToast({ incoming, onClose }: { incoming: IncomingSkill | null; onClose: () => void }) {
  return (
    <Toast
      open={incoming !== null}
      onClose={onClose}
      tone="info"
      autoHideMs={6000}
      title={incoming ? `${incoming.casterName} froze your ${incoming.symbol}` : ""}
      body={incoming ? `Its return holds at ${formatBps(incoming.heldBps)} until the round settles.` : undefined}
    />
  );
}
