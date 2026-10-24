"use client";

// Commit skills and LOCK help your picks; FLIP, SWAP and FREEZE target rivals.

import { useState, type ReactNode } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { formatBps } from "@/components/table-scene/model";
import type { CoinSymbol } from "@/components/table-scene/types";
import { COIN } from "@/lib/coins";
import { SKILLS } from "./info";
import { swapCoins, targetBlock, targetsFor } from "./rules";
import { SkillCoin } from "./SkillEffect2D";
import type { SkillCard, SkillHandProps, SkillPick, SkillTarget } from "./types";

type Table = Pick<SkillHandProps, "phase" | "liveDeadlinePassed" | "usedThisRound" | "ownPicks" | "opponentPicks" | "boardCoins">;

const TOGGLE =
  "rounded-[14px] border-[3px] border-garis text-left transition-colors disabled:cursor-not-allowed aria-pressed:bg-papan-terang aria-pressed:outline aria-pressed:outline-[3px] aria-pressed:outline-emas";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="flex items-center gap-2 text-sm font-extrabold text-white/85">
        <span className="font-display grid h-6 w-6 place-items-center rounded-full border-2 border-garis bg-emas text-sm text-garis">{n}</span>
        {title}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}

function PickOption({ pick, block, selected, showOwner, onSelect }: {
  pick: SkillPick;
  block: string | null;
  selected: boolean;
  showOwner: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={Boolean(block)}
      aria-pressed={selected}
      onClick={onSelect}
      className={`${TOGGLE} flex w-full items-center gap-2.5 bg-papan px-3 py-2 enabled:hover:bg-papan-terang disabled:bg-dasar`}
    >
      <SkillCoin symbol={pick.symbol} effect={pick.effect} className={`h-7 w-7 ${block ? "opacity-60" : ""}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">
          {showOwner && <span className="text-white/70">{pick.ownerName} </span>}
          {pick.symbol} <span className={pick.side === "Buy" ? "text-naik" : "text-turun"}>{pick.side}</span>
        </span>
        {block ? (
          <span className="block text-xs font-bold text-white/55">{block}</span>
        ) : (
          pick.returnBps !== undefined && <span className="block text-xs font-bold text-white/70">{formatBps(pick.returnBps)} so far</span>
        )}
      </span>
    </button>
  );
}

type SkillPickerProps = {
  card: SkillCard;
  table: Table;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (target: SkillTarget) => void;
};

export function SkillPicker({ card, table, pending, onCancel, onConfirm }: SkillPickerProps) {
  const info = SKILLS[card.skill];
  const [pickId, setPickId] = useState<string>();
  const [coin, setCoin] = useState<CoinSymbol>();

  const picks = targetsFor(card, table);
  const pick = picks.find((p) => p.id === pickId);
  const swap = info.target === "swap";
  const ready = Boolean(pick) && (!swap || (coin && swapCoins(table, pick).includes(coin)));
  const verb = info.timing === "commit" ? "Add" : "Cast";
  const opponent = info.target !== "own";

  const confirm = () => {
    if (!pick) return;
    onConfirm(swap && coin ? { pickId: pick.id, swapTo: { symbol: coin, side: pick.side } } : { pickId: pick.id });
  };

  return (
    <div className="rounded-[16px] border-[3px] border-garis bg-malam p-4" role="group" aria-label={`${card.skill} target`}>
      <p className="font-display text-xl text-gading">{card.skill}</p>
      <p className="font-semibold leading-relaxed text-white/75">
        {info.effect}
        {info.timing === "commit" && " It's sealed with your picks, so rivals see it only at reveal."}
      </p>

      <div className="mt-3">
        <Step n={1} title={opponent ? "Choose a rival pick" : "Choose one of your picks"}>
          <div className="grid gap-2 sm:grid-cols-2">
            {picks.map((p) => (
              <PickOption
                key={p.id}
                pick={p}
                block={targetBlock(card, p, table)}
                selected={p.id === pickId}
                showOwner={opponent}
                onSelect={() => { setPickId(p.id); setCoin(undefined); }}
              />
            ))}
          </div>
        </Step>

        {swap && pick && (
          <Step n={2} title="Choose the new coin">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {swapCoins(table, pick).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === coin}
                  onClick={() => setCoin(c)}
                  className={`${TOGGLE} flex flex-col items-center gap-1 bg-papan px-1 py-2 hover:bg-papan-terang`}
                >
                  <SkillCoin symbol={c} className="h-7 w-7" />
                  <span className="text-xs font-extrabold">{COIN[c].symbol}</span>
                </button>
              ))}
            </div>
          </Step>
        )}


      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {pick && (
          <p className="mr-auto text-sm font-bold text-white/70">
            {opponent ? `${pick.ownerName}'s ` : "Your "}
            {pick.symbol} {pick.side}
            {swap && coin && ` becomes ${coin} ${pick.side}`}
          </p>
        )}
        <GameActionButton variant="night" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </GameActionButton>
        <GameActionButton
          size="sm"
          onClick={pending ? undefined : confirm}
          disabled={!ready}
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
        >
          {pending ? (info.timing === "commit" ? "Adding…" : "Casting…") : `${verb} ${card.skill}`}
        </GameActionButton>
      </div>
    </div>
  );
}
