"use client";

import { useWallet } from "@/components/shell/WalletProvider";
import { GameButton } from "@/components/ui/GameButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePosition, useSeasons } from "@/lib/api/hooks";
import { formatMusd } from "@/lib/format";
import { LiveSeasons } from "./LiveSeasons";

const LENGTHS = {
  week: { label: "1 week", demoMinutes: 15 },
  month: { label: "1 month", demoMinutes: 30 },
} as const;

/** The open seasons from GET /seasons/current, with real countdowns. */
export function LiveSeasonsPanel() {
  const seasons = useSeasons();
  if (seasons.isPending) return <Skeleton className="h-40 w-full" label="Loading seasons" />;
  if (seasons.isError || seasons.data.length === 0) {
    return (
      <p className="rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3 font-extrabold text-white/75">
        {seasons.isError ? "Seasons could not be loaded right now." : "No season is open. The next one starts soon."}
      </p>
    );
  }
  // Remount on every refetch so the local ticking restarts from the fresh server-derived clock.
  return <LiveSeasons key={seasons.dataUpdatedAt} seasons={seasons.data} now={Math.floor(Date.now() / 1000)} lengths={LENGTHS} />;
}

/** "Deposit mUSD" before you hold a position, "Play" once you do. */
export function PositionCta() {
  const { ready, address } = useWallet();
  const position = usePosition(address);
  const held = position.data;

  if (ready && held) {
    return (
      <>
        <p className="mt-4 text-lg font-semibold text-white/80">
          Your {formatMusd(held.principal)} is in the {LENGTHS[held.tenor].label} season. {held.gamesCounted} of {held.countedGames} counted games
          played.
        </p>
        <GameButton href="/play" size="lg" className="mt-6">
          Play
        </GameButton>
      </>
    );
  }
  return (
    <GameButton href="/deposit" size="lg" className="mt-8">
      Deposit mUSD
    </GameButton>
  );
}
