"use client";

import { useEffect, useState } from "react";
import { fetchHistory, fetchLeaderboard, fetchSeasons, sessionAddress, type StatsProfile, type StatsSeason } from "@/lib/stats/api";
import { LEADERBOARDS, YOU, type LeaderboardResponse } from "@/mocks/leaderboard";
import { PROFILE } from "@/mocks/profile";
import { LeaderboardScreen } from "./LeaderboardScreen";
import { ProfileScreen } from "./ProfileScreen";
import { LeaderboardSkeleton, ProfileSkeleton } from "./StatsSkeletons";
import { GameActionButton } from "@/components/ui/GameButton";

export function LiveStats({ kind, medals, emptyArt }: { kind: "leaderboard" | "profile"; medals?: (string | undefined)[]; emptyArt?: string }) {
  const [data, setData] = useState<{ address: string | null; boards?: LeaderboardResponse[]; profile?: StatsProfile; simulated?: boolean; seasons?: StatsSeason[] }>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const address = sessionAddress();
    async function load() {
      if (!address || process.env.NEXT_PUBLIC_USE_MOCKS === "1") {
        setData({ address: null, boards: [...LEADERBOARDS], profile: PROFILE, simulated: true });
        return;
      }
      try {
        if (kind === "profile") {
          const profile = await fetchHistory(address, controller.signal);
          if (!controller.signal.aborted) setData({ address, profile });
        } else {
          const { seasons } = await fetchSeasons(controller.signal);
          // The API returns newest first; expose the newest season of each tenor.
          const current = seasons.filter((season, i) => seasons.findIndex((s) => s.tenor === season.tenor) === i);
          if (!controller.signal.aborted) setData({ address, seasons: current });
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [kind, attempt]);
  if (error) return <div role="status" className="mx-auto max-w-4xl px-4 py-10 font-semibold text-white/75">Couldn&apos;t load your stats. Please try again.<div className="mt-4"><GameActionButton onClick={() => { setError(false); setAttempt(attempt + 1); }}>Retry</GameActionButton></div></div>;
  if (!data) return kind === "leaderboard" ? <LeaderboardSkeleton /> : <ProfileSkeleton />;
  return <>
    {!data.address && <p role="note" className="mx-auto max-w-6xl px-4 pt-6 text-sm font-semibold text-white/70">Sample data: sign in to see your games</p>}
    {kind === "profile" && data.profile && <ProfileScreen profile={data.profile} emptyArt={emptyArt} sample={!data.address} />}
    {kind === "leaderboard" && data.address && <LiveLeaderboard key={data.address} address={data.address} seasons={data.seasons ?? []} medals={medals} emptyArt={emptyArt} />}
    {kind === "leaderboard" && !data.address && (data.boards?.length ? <LeaderboardScreen boards={data.boards} you={data.address ?? YOU} yourTenor={data.boards.find((b) => b.entries.some((e) => e.address.toLowerCase() === data.address?.toLowerCase()))?.tenor} medals={medals} emptyArt={emptyArt} simulated={data.simulated} /> : <p role="status" className="px-4 py-10 text-center font-semibold text-white/75">No current seasons. Check back soon.</p>)}
  </>;
}

function LiveLeaderboard({ address, seasons, medals, emptyArt }: { address: string; seasons: StatsSeason[]; medals?: (string | undefined)[]; emptyArt?: string }) {
  const [tenor, setTenor] = useState(seasons[0]?.tenor);
  const selected = seasons.find((s) => s.tenor === tenor);
  const [result, setResult] = useState<{ id: number; board?: LeaderboardResponse; error?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetchLeaderboard(selected.seasonId, controller.signal).then(
      (board) => { if (!controller.signal.aborted) setResult({ id: selected.seasonId, board }); },
      () => { if (!controller.signal.aborted) setResult({ id: selected.seasonId, error: true }); },
    );
    return () => controller.abort();
  }, [selected, attempt]);
  if (!selected) return <p role="status" className="px-4 py-10 text-center font-semibold text-white/75">No current seasons. Check back soon.</p>;
  const current = result?.id === selected.seasonId ? result : undefined;
  const boards = seasons.map((s) => current?.board?.seasonId === s.seasonId ? current.board : { seasonId: s.seasonId, tenor: s.tenor, bonusPot: s.bonusPot, countedGames: 0, entries: [] });
  return <LeaderboardScreen boards={boards} you={address} medals={medals} emptyArt={emptyArt} simulated={selected.demoMode ?? false} onTenorChange={setTenor} loading={!current} error={current?.error} onRetry={() => { setResult(undefined); setAttempt(attempt + 1); }} />;
}
