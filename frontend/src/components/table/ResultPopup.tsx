"use client";

// End-of-game result over the arena (2D and 3D alike): a centered modal on desktop, a bottom
// sheet on phones. One staged moment (~2 s): ribbon drops, medal flips in, score counts up,
// points chip pops, buttons rise. Rank #1-#3 add rays and a coin burst behind the medal.

import { animate, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { useDialog } from "@/components/ui/useDialog";
import { DEMO_SEASON, PLAYERS } from "@/mocks/table";
import { gameScores, type DemoState } from "./demo-engine";
import { finalOutcome, rankOf } from "./result-outcome";

const noop = () => () => {};
const INSTANT = { duration: 0 } as const;
const spring = (delay: number, stiffness = 260, damping = 16) => ({ type: "spring", stiffness, damping, delay }) as const;

// Deterministic fan of coins: varied size, arc, spin and delay, so no two fly alike.
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = -Math.PI / 2 + (i / 13 - 0.5) * 2.6 + Math.sin(i * 7.3) * 0.14;
  const reach = 74 + ((i * 37) % 46);
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, size: 9 + ((i * 5) % 8), spin: ((i * 53) % 140) - 70, delay: (i % 5) * 0.045, time: 1.3 + (i % 3) * 0.12 };
});

function CoinBurst({ count }: { count: number }) {
  const scale = count < 14 ? 0.72 : 1;
  return <div className="jitu-result-burst" aria-hidden="true">{BURST.slice(0, count).map((coin, i) => <motion.span key={i} className="jitu-result-coin"
    style={{ width: coin.size, height: coin.size }}
    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
    // Rise fast, slow at the apex, then fall faster: a gravity-like arc.
    animate={{ x: [0, coin.x * scale * 0.75, coin.x * scale], y: [0, coin.y * scale, coin.y * scale + 70 + coin.size * 3], opacity: [0, 1, 0], scale: [0.4, 1, 0.85], rotate: [0, coin.spin, coin.spin * 2.4] }}
    transition={{ duration: coin.time, delay: 0.55 + coin.delay, times: [0, 0.38, 1], ease: ["easeOut", "easeIn"] }} />)}</div>;
}

function CountUp({ value, delay, still }: { value: number; delay: number; still: boolean }) {
  const node = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (still) return;
    const run = animate(0, value, { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { if (node.current) node.current.textContent = Math.round(v).toLocaleString("en-US"); } });
    return () => run.stop();
  }, [value, delay, still]);
  return <span ref={node} aria-hidden="true">{(still ? value : 0).toLocaleString("en-US")}</span>;
}

export function ResultPopup({ state, onClose }: { state: DemoState; onClose: () => void }) {
  const still = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Portals need document.body, which only exists after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useDialog(mounted, onClose, panel);
  if (!mounted) return null;

  const scores = gameScores(state);
  const outcome = finalOutcome(scores);
  const eligible = state.scenario !== "outside-k" && state.scenario !== "season-cutoff";
  const credited = eligible ? Math.max(0, scores.you) : 0;
  const reason = state.scenario === "outside-k" ? `Outside your first ${DEMO_SEASON.countedGames} games, so this one was practice.`
    : state.scenario === "season-cutoff" ? "Finished after the season cutoff, so no points were credited."
      : scores.you < 0 ? "Negative game scores add zero season points." : null;
  const at = (delay: number, stiffness?: number, damping?: number) => still ? INSTANT : spring(delay, stiffness, damping);
  const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: at(delay, 220, 20) });

  return createPortal(<div className="jitu-result" data-rank={outcome.rank}>
    <motion.div className="jitu-result-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={still ? INSTANT : { duration: 0.25 }} />
    <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="jitu-result-panel"
      initial={{ opacity: 0, y: 48, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={at(0.05, 240, 24)}>
      <GameActionButton variant="night" size="sm" className="jitu-result-close" onClick={onClose}>View table</GameActionButton>
      <motion.h2 id={titleId} className="jitu-result-ribbon" initial={{ opacity: 0, y: -46, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={at(0.15, 380, 14)}>
        <span>{outcome.title}</span>
      </motion.h2>
      <div className="jitu-result-emblem">
        {outcome.particles > 0 && !still && <motion.div className="jitu-result-rays" aria-hidden="true" style={{ scale: outcome.rank === 1 ? 1 : 0.8 }}
          initial={{ opacity: 0, rotate: -10 }} animate={{ opacity: [0, 0.95, 0], rotate: 50 }} transition={{ duration: 2.3, delay: 0.45, ease: "easeOut", times: [0, 0.25, 1] }}>
          <Image src="/assets/table-fx/win-burst.webp" alt="" fill sizes="220px" />
        </motion.div>}
        {outcome.particles > 0 && !still && <CoinBurst count={outcome.particles} />}
        {outcome.medal
          ? <motion.div className="jitu-result-medal" initial={{ opacity: 0, rotateY: -160, rotate: -8, scale: 0.5 }} animate={{ opacity: 1, rotateY: 0, rotate: 0, scale: 1 }} transition={at(0.4, 170, 13)}>
            <Image src={outcome.medal} alt="" width={256} height={256} priority />
          </motion.div>
          : <motion.div className="jitu-result-medal" data-calm="true" initial={{ opacity: 0, y: -10, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={at(0.4, 140, 18)}>
            <Image src="/brand/jitu-crest.webp" alt="" width={256} height={256} />
          </motion.div>}
      </div>
      <p className="jitu-result-rank">Rank #{outcome.rank} of {PLAYERS.length}{outcome.shared ? ", tied" : ""}</p>
      <p className="jitu-result-score"><span className="sr-only">Game score {scores.you}</span><CountUp value={scores.you} delay={0.7} still={still} /><small>game score</small></p>
      {outcome.tip && <p className="jitu-result-tip">Tip: {outcome.tip}</p>}
      <ol className="jitu-result-standings" aria-label="Final standings">{[...PLAYERS].sort((a, b) => scores[b.id] - scores[a.id]).map((player) => <li key={player.id} data-you={player.human} style={{ "--seat": player.color } as CSSProperties}>
        <Image src={player.portrait} alt="" width={32} height={32} /><span>#{rankOf(scores, player.id)} {player.name}</span><strong>{scores[player.id]}</strong>
      </li>)}</ol>
      <motion.div className="jitu-result-points" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={at(1.35, 420, 14)}>
        {state.server ? <strong>Season credit pending backend confirmation</strong> : <strong>+{credited} season points <small>(simulated)</small>{eligible && <> · Game {DEMO_SEASON.gamesPlayed + 1}/{DEMO_SEASON.countedGames}</>}</strong>}
        {reason && <p>{reason}</p>}
      </motion.div>
      {state.earned.length > 0 && <motion.div className="jitu-result-skills" {...rise(1.45)}><span>Skills earned</span>
        <ul>{state.earned.map((skill, i) => <li key={i}><Image src={`/assets/skills/${skill.toLowerCase()}.webp`} alt="" width={28} height={40} />{skill}</li>)}</ul></motion.div>}
      <motion.p className="jitu-result-safe" {...rise(1.5)}>{state.server ? "Game complete. Your principal stays safe." : "Your principal is safe. Demo result only, not saved."}</motion.p>
      <div className="jitu-result-actions">
        <motion.div {...rise(1.55)}><GameButton href="/play" data-autofocus>Play again</GameButton></motion.div>
        <motion.div {...rise(1.62)}><GameButton href="/leaderboard?highlight=you" variant="night" size="sm">See your rank</GameButton></motion.div>
        <motion.div {...rise(1.69)}><GameButton href="/profile?game=latest" variant="night" size="sm">Game details</GameButton></motion.div>
      </div>
    </motion.div>
  </div>, document.body);
}
