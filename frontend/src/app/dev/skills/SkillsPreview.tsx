"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiddenHand, IncomingSkillToast, SKILL_ORDER, SkillCoin, SkillHand, type IncomingSkill, type SkillCard, type SkillPick, type SkillTarget } from "@/components/skills";
import { TableScene, type ScenePlayer, type SkillEffect, type TablePhase } from "@/components/table-scene";
import { signedBps } from "@/components/table-scene/model";
import { FIXTURE_COINS, FIXTURE_SEATS, returnBps, useFixtureTable, type FixtureSeat } from "@/components/table-scene/fixture";
import { Board } from "@/components/ui/Board";
import { chipClass } from "@/components/ui/Chip";
import { GameActionButton } from "@/components/ui/GameButton";
import { useDevState } from "@/lib/use-dev-state";
import { STATES, type SkillsState } from "./states";

type Scenario = {
  phase: TablePhase;
  cards: SkillCard[];
  seats: FixtureSeat[];
  deadline?: boolean;
  used?: boolean;
  note?: string;
};

const card = (skill: SkillEffect, n = 1): SkillCard => ({ id: `${skill.toLowerCase()}-${n}`, skill });

/** FIXTURE_SEATS with each player's picks replaced by `picks` (by seat id). */
function seatsWith(picks: Partial<Record<string, FixtureSeat["picks"]>>): FixtureSeat[] {
  return FIXTURE_SEATS.map((s) => ({ ...s, picks: picks[s.id] ?? s.picks }));
}

const YOU_CLEAN: FixtureSeat["picks"] = [
  { symbol: "ETH", side: "Buy" },
  { symbol: "SOL", side: "Sell" },
  { symbol: "MON", side: "Buy" },
];

function scenario(state: SkillsState): Scenario {
  switch (state) {
    case "commit":
      return { phase: "commit", cards: [card("BOOST"), card("INSURANCE"), card("FLIP")], seats: seatsWith({ you: YOU_CLEAN }) };
    case "not-live":
      return { phase: "reveal", cards: [card("LOCK"), card("FLIP"), card("FREEZE")], seats: seatsWith({ you: YOU_CLEAN }) };
    case "past-deadline":
      return { phase: "live", deadline: true, cards: [card("LOCK"), card("SWAP")], seats: seatsWith({ you: YOU_CLEAN }) };
    case "used":
      return {
        phase: "live",
        used: true,
        cards: [card("LOCK"), card("FREEZE")],
        seats: seatsWith({ you: [YOU_CLEAN[0], { symbol: "SOL", side: "Buy", effect: "FLIP" }, YOU_CLEAN[2]] }),
      };
    case "pick-affected":
      return {
        phase: "live",
        cards: [card("LOCK"), card("SWAP"), card("FREEZE")],
        note: "A one-pick round: Bera froze your only pick, Bruno is insured and Dex is already frozen.",
        seats: seatsWith({
          you: [{ symbol: "ETH", side: "Buy", effect: "FREEZE", effectBy: "Bera", heldBps: 6.4 }],
          dex: [{ symbol: "AVAX", side: "Buy", effect: "FREEZE", effectBy: "Bruno", heldBps: -3.1 }, { symbol: "BNB", side: "Sell" }],
        }),
      };
    case "empty":
      return { phase: "live", cards: [], seats: seatsWith({ you: YOU_CLEAN }) };
    case "incoming-freeze":
      return { phase: "live", cards: [card("LOCK"), card("FLIP")], seats: seatsWith({ you: YOU_CLEAN }) };
    case "all-effects":
      return {
        phase: "live",
        used: true,
        cards: [card("LOCK")],
        note: "All six spells at once. Not a legal round: it's here to check every effect side by side.",
        seats: seatsWith({
          you: [{ symbol: "ETH", side: "Buy", effect: "BOOST" }, { symbol: "SOL", side: "Buy", effect: "FLIP" }, { symbol: "MON", side: "Buy", effect: "LOCK", heldBps: 9.2 }],
          bruno: [{ symbol: "BTC", side: "Buy" }, { symbol: "DOGE", side: "Buy", effect: "INSURANCE" }],
          bera: [{ symbol: "XRP", side: "Sell" }, { symbol: "ETH", side: "Sell", effect: "FREEZE", effectBy: "You", heldBps: 4.8 }],
          dex: [{ symbol: "AVAX", side: "Buy", effect: "SWAP", swappedFrom: "BNB" }, { symbol: "DOGE", side: "Sell" }],
        }),
      };
    default:
      return { phase: "live", cards: [card("LOCK"), card("SWAP"), card("FREEZE")], seats: seatsWith({ you: YOU_CLEAN }) };
  }
}

const RIVAL_HANDS = [
  { name: "Bruno", count: 2 },
  { name: "Bera", count: 1 },
  { name: "Dex", count: 3 },
];

const VIEWS = ["auto", "3d", "2d"] as const;
type View = (typeof VIEWS)[number];

const pickId = (seatId: string, index: number) => `${seatId}:${index}`;

function toSkillPicks(player: ScenePlayer): SkillPick[] {
  return player.picks.map((pick, i) => ({
    id: pickId(player.id, i),
    ownerId: player.id,
    ownerName: player.name,
    symbol: pick.symbol,
    side: pick.side,
    returnBps: signedBps(pick),
    effect: pick.effect,
  }));
}

/** Applies a cast skill to the dummy seats, as the backend would after the tx lands. */
function applySkill(seats: FixtureSeat[], skill: SkillEffect, target: SkillTarget, rawBps: (sym: FixtureSeat["picks"][number]["symbol"]) => number, by?: string) {
  const [seatId, index] = target.pickId.split(":");
  return seats.map((seat) =>
    seat.id !== seatId
      ? seat
      : {
          ...seat,
          picks: seat.picks.map((pick, i) => {
            if (i !== Number(index)) return pick;
            switch (skill) {
              case "LOCK":
                return { ...pick, effect: skill, heldBps: rawBps(pick.symbol) };
              case "FREEZE":
                return { ...pick, effect: skill, effectBy: by, heldBps: rawBps(pick.symbol) };
              case "FLIP":
                return { ...pick, effect: skill, side: pick.side === "Buy" ? ("Sell" as const) : ("Buy" as const) };
              case "SWAP":
                return target.swapTo ? { ...target.swapTo, effect: skill, swappedFrom: pick.symbol } : pick;
              default:
                return { ...pick, effect: skill };
            }
          }),
        },
  );
}

function Round({ state, view }: { state: SkillsState; view: View }) {
  const start = scenario(state);
  const [seats, setSeats] = useState(start.seats);
  const [cards, setCards] = useState(start.cards);
  const [used, setUsed] = useState(start.used ?? false);
  const [incoming, setIncoming] = useState<IncomingSkill | null>(null);
  const table = useFixtureTable(start.phase, seats);

  // The incoming-freeze state: Bera freezes your best pick shortly after Live opens.
  const latest = useRef(table);
  useEffect(() => {
    latest.current = table;
  });
  useEffect(() => {
    if (state !== "incoming-freeze") return;
    const id = setTimeout(() => {
      const you = latest.current.players.find((p) => p.isYou);
      const best = you?.picks
        .map((pick, i) => ({ pick, i }))
        .filter(({ pick }) => !pick.effect)
        .sort((a, b) => signedBps(b.pick) - signedBps(a.pick))[0];
      if (!you || !best) return;
      const raw = returnBps(latest.current.prices[best.pick.symbol]);
      setSeats((s) => applySkill(s, "FREEZE", { pickId: pickId(you.id, best.i) }, () => raw, "Bera"));
      setIncoming({ casterName: "Bera", symbol: best.pick.symbol, heldBps: signedBps({ ...best.pick, returnBps: raw }) });
    }, 1800);
    return () => clearTimeout(id);
  }, [state]);

  const you = table.players.find((p) => p.isYou);
  const ownPicks = you ? toSkillPicks(you) : [];
  const opponentPicks = table.players.filter((p) => !p.isYou).flatMap(toSkillPicks);

  const onUse = async (cast: SkillCard, target: SkillTarget) => {
    // Dummy round trip: pending, then the spell lands. No transaction.
    await new Promise((r) => setTimeout(r, 900));
    setSeats((s) => applySkill(s, cast.skill, target, (sym) => returnBps(latest.current.prices[sym]), "You"));
    setCards((c) => c.filter((x) => x.id !== cast.id));
    setUsed(true);
  };

  return (
    <>
      <div className="relative h-[440px] overflow-hidden rounded-[22px] border-[3px] border-garis bg-dasar shadow-[0_6px_0_0_#040B10] sm:h-[520px]">
        <div className="absolute inset-0 overflow-y-auto">
          <TableScene {...table} phase={start.phase} view={view} className="h-full" />
        </div>
      </div>
      {start.note && <p className="mt-3 max-w-xl text-sm font-semibold leading-relaxed text-white/70">{start.note}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <SkillHand
          cards={cards}
          phase={start.phase}
          liveDeadlinePassed={start.deadline}
          usedThisRound={used}
          ownPicks={ownPicks}
          opponentPicks={opponentPicks}
          boardCoins={FIXTURE_COINS}
          onUse={onUse}
        />
        <Board>
          <h2 className="font-display text-2xl text-gading">Rival hands</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-white/70">You see how many skills each bot holds, never which.</p>
          <div className="mt-3 space-y-2">
            {RIVAL_HANDS.map((h) => (
              <HiddenHand key={h.name} name={h.name} count={h.name === "Bera" && incoming ? 0 : h.count} />
            ))}
          </div>
        </Board>
      </div>

      <IncomingSkillToast incoming={incoming} onClose={() => setIncoming(null)} />
    </>
  );
}

function Spells({ round }: { round: number }) {
  return (
    <Board className="mt-6">
      <h2 className="font-display text-2xl text-gading">Spells, flat</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-white/70">The 2D effects the fallback table and the picker use.</p>
      <ul className="mt-4 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-6">
        {SKILL_ORDER.map((skill) => (
          <li key={`${skill}-${round}`} className="flex flex-col items-center gap-2">
            {/* The sprites spill to about 2.3x the coin, so the coin sits in a box that size and the label stays clear. */}
            <div className="grid h-24 w-full place-items-center sm:h-28">
              <SkillCoin symbol={skill === "SWAP" ? "SOL" : "ETH"} swappedFrom="BNB" effect={skill} className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <span className="relative font-display text-sm text-gading">{skill}</span>
          </li>
        ))}
      </ul>
    </Board>
  );
}

export function SkillsPreview() {
  const state = useDevState(STATES);
  const params = useSearchParams();
  const pathname = usePathname();
  const view = VIEWS.find((v) => v === params.get("view")) ?? "auto";
  const [round, setRound] = useState(0);

  const viewHref = (v: View) => {
    const next = new URLSearchParams(params.toString());
    if (v === "auto") next.delete("view");
    else next.set("view", v);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Skills</h1>
          <p className="mt-1 max-w-xl font-semibold leading-relaxed text-white/70">
            Dev preview of the skill hand, its target pickers and the six spells on a dummy round.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-white/70">View</span>
          {VIEWS.map((v) => (
            <Link key={v} href={viewHref(v)} scroll={false} aria-current={v === view ? "true" : undefined} className={chipClass(v === view ? "gold" : "night")}>
              {v}
            </Link>
          ))}
          <GameActionButton variant="night" size="sm" onClick={() => setRound((r) => r + 1)}>
            Replay
          </GameActionButton>
        </div>
      </div>
      <div className="mt-6">
        {/* Keyed so a state change or Replay restarts the round and its spells. */}
        <Round key={`${state}-${round}`} state={state} view={view} />
      </div>
      <Spells round={round} />
    </div>
  );
}
