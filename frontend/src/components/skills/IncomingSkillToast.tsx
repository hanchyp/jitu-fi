"use client";

import { useEffect } from "react";
import { Toast } from "@/components/ui/Toast";
import { GameActionButton } from "@/components/ui/GameButton";
import { formatBps } from "@/components/table-scene/model";
import type { CoinSymbol } from "@/components/table-scene/types";

export type IncomingSkill = {
  casterName: string;
  symbol: CoinSymbol;
  heldBps: number;
  skill?: "FREEZE" | "FLIP" | "SWAP";
  swapSymbol?: CoinSymbol;
};

export function IncomingSkillToast({ incoming, onClose, inline = false }: { incoming: IncomingSkill | null; onClose: () => void; inline?: boolean }) {
  useEffect(() => {
    if (!inline || !incoming) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [inline, incoming, onClose]);
  const skill = incoming?.skill ?? "FREEZE";
  const verb = skill === "FREEZE" ? "froze" : skill === "FLIP" ? "flipped" : "swapped";
  const title = incoming ? `${incoming.casterName} ${verb} your ${incoming.symbol}` : "";
  const body = incoming ? skill === "FREEZE" ? `Return holds at ${formatBps(incoming.heldBps)} until settlement.` : skill === "FLIP" ? "Buy/Sell reverses from this price. Your earlier return stays." : `Now ${incoming.swapSymbol}, with the same Buy/Sell. Your earlier return stays.` : undefined;
  if (inline) return incoming && <div role="status" className="jitu-table-incoming"><div><strong>{title}</strong><p>{body}</p></div><GameActionButton variant="night" size="sm" onClick={onClose} aria-label="Dismiss incoming skill">Close</GameActionButton></div>;
  return <Toast open={incoming !== null} onClose={onClose} tone="info" autoHideMs={6000} title={title} body={body} />;
}
