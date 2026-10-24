"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useWallet } from "@/components/shell/WalletProvider";
import { Board } from "@/components/ui/Board";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePosition } from "@/lib/api/hooks";
import { ABIS, ADDRESSES, deployment, publicClient } from "@/lib/web3/config";
import { sendTx } from "@/lib/web3/tx";
import type { ClaimSnapshot } from "@/mocks/claim";
import { ClaimScreen, type ClaimView } from "./ClaimScreen";

const FINALIZED = 3;

type RawSeason = { enrollStart: bigint; start: bigint; end: bigint; status: number; shortfall: boolean; totalPrincipal: bigint; sponsorFunds: bigint; bonusPot: bigint };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Claim</h1>
      <Board className="mx-auto mt-8 max-w-2xl">{children}</Board>
    </section>
  );
}

/** /claim with the real position and SeasonVault.claim. */
export function LiveClaim() {
  const { ready, address, connect, getWalletClient } = useWallet();
  const queryClient = useQueryClient();
  const position = usePosition(address);
  const seasonId = position.data?.seasonId;
  const season = useQuery({
    queryKey: ["season", seasonId],
    queryFn: () =>
      publicClient.readContract({ address: ADDRESSES.vault, abi: ABIS.vault, functionName: "getSeason", args: [BigInt(seasonId as number)] }) as Promise<RawSeason>,
    enabled: seasonId !== undefined,
    refetchInterval: 10_000,
  });

  const claim = useCallback(async () => {
    if (!address || seasonId === undefined) throw new Error("No position to claim");
    const wallet = await getWalletClient();
    const hash = await sendTx({ wallet, address: ADDRESSES.vault, abi: ABIS.vault, functionName: "claim", args: [BigInt(seasonId)] });
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    return hash;
  }, [address, seasonId, getWalletClient, queryClient]);

  if (!ready || (address && (position.isPending || (seasonId !== undefined && season.isPending)))) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Skeleton className="mt-3 h-12 w-72 max-w-full" />
        <Skeleton className="mt-8 h-[640px] w-full" label="Loading your claim" />
      </section>
    );
  }

  if (!address) {
    return (
      <Shell>
        <EmptyState
          art="/assets/landing/claim-treasure.webp"
          title="Connect to claim"
          body="Sign in to see your season payout."
          action={<GameActionButton size="lg" onClick={connect}>Connect</GameActionButton>}
        />
      </Shell>
    );
  }

  if (!position.data || !season.data) {
    return (
      <Shell>
        <EmptyState
          art="/assets/landing/claim-treasure.webp"
          title="Your chest is waiting"
          body="Deposit mUSD into a season and play your games. At maturity, claim your returned principal, base yield and bonus here."
          action={<GameButton href="/deposit" size="lg">Deposit mUSD</GameButton>}
        />
      </Shell>
    );
  }

  const p = position.data;
  const s = season.data;
  const finalized = s.status === FINALIZED;
  const snapshot: ClaimSnapshot = {
    season: {
      seasonId: p.seasonId,
      tenor: p.tenor,
      status: finalized ? "Finalized" : "Active",
      enrollStart: Number(s.enrollStart),
      start: Number(s.start),
      end: Number(s.end),
      totalPrincipal: s.totalPrincipal,
      bonusPot: s.bonusPot > s.sponsorFunds ? s.bonusPot : s.sponsorFunds,
      sponsorFunds: s.sponsorFunds,
      demoMode: deployment.demoMode,
    },
    position: p,
    payout: p.previewClaim,
    shortfall: s.shortfall ? { returned: p.previewClaim.principal } : null,
  };
  const view: ClaimView = !finalized ? "not-mature" : s.shortfall ? "shortfall" : "ready";
  const secondsToMaturity = Math.max(0, Number(s.end) - Math.floor(Date.now() / 1000));

  return <ClaimScreen key={`${p.seasonId}-${view}`} view={view} snapshot={snapshot} secondsToMaturity={secondsToMaturity} onClaim={claim} />;
}
