import type { Metadata } from "next";
import { Suspense } from "react";
import { statsArt } from "@/components/stats/art";
import { LeaderboardScreen } from "@/components/stats/LeaderboardScreen";
import { LeaderboardSkeleton } from "@/components/stats/StatsSkeletons";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { readDevState, type SearchParams } from "@/lib/dev-state";
import { LEADERBOARDS, LEADERBOARDS_EMPTY, LEADERBOARDS_YOU_UNRANKED, YOU } from "@/mocks/leaderboard";
import { POSITION_ACTIVE_WEEK } from "@/mocks/position";

export const metadata: Metadata = {
  title: "Leaderboard | jitu.fi",
};

const STATES = ["default", "empty", "loading", "you-not-ranked"] as const;

const MEDALS = [statsArt("medal-1.webp"), statsArt("medal-2.webp"), statsArt("medal-3.webp")];
const EMPTY_ART = statsArt("empty-leaderboard.webp");

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Leaderboard searchParams={searchParams} />
      </Suspense>
      <DevStateBar states={STATES} />
    </main>
  );
}

async function Leaderboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = await readDevState(searchParams, STATES);
  if (state === "loading") return <LeaderboardSkeleton />;

  const boards = state === "empty" ? LEADERBOARDS_EMPTY : state === "you-not-ranked" ? LEADERBOARDS_YOU_UNRANKED : LEADERBOARDS;
  // key: switching dev state resets the selected tab.
  return (
    <LeaderboardScreen
      key={state}
      boards={boards}
      you={YOU}
      yourTenor={POSITION_ACTIVE_WEEK.tenor}
      medals={MEDALS}
      emptyArt={EMPTY_ART}
    />
  );
}
