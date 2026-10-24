import type { Metadata } from "next";
import { Suspense } from "react";
import { Board } from "@/components/ui/Board";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameButton } from "@/components/ui/GameButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClaimScreen, type ClaimView } from "@/components/vault/ClaimScreen";
import { readDevState, type SearchParams } from "@/lib/dev-state";
import { CLAIM_NOT_MATURE, CLAIM_READY, CLAIM_SHORTFALL } from "@/mocks/claim";
import { MOCK_NOW } from "@/mocks/season";

export const metadata: Metadata = {
  title: "Claim | jitu.fi",
};

const STATES = ["ready", "pending", "claimed", "not-mature", "shortfall", "no-position", "wrong-network"] as const;

export default function ClaimPage({ searchParams }: PageProps<"/claim">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<ClaimSkeleton />}>
        <Claim searchParams={searchParams} />
      </Suspense>
      <DevStateBar states={STATES} />
    </main>
  );
}

async function Claim({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = await readDevState(searchParams, STATES);

  if (state === "no-position") {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Claim</h1>
        <Board className="mx-auto mt-8 max-w-2xl">
          <EmptyState
            art="/assets/landing/claim-treasure.webp"
            title="Your chest is waiting"
            body="Deposit mUSD into a season and play your games. At maturity your principal, base yield and bonus land here, ready to claim."
            action={
              <GameButton href="/deposit" size="lg">
                Deposit mUSD
              </GameButton>
            }
          />
        </Board>
      </section>
    );
  }

  // wrong-network shows the ready screen under the shell's network overlay.
  const view: ClaimView = state === "wrong-network" ? "ready" : state;
  const snapshot = view === "not-mature" ? CLAIM_NOT_MATURE : view === "shortfall" ? CLAIM_SHORTFALL : CLAIM_READY;
  // key: switching dev state resets the screen's claim flow.
  return (
    <ClaimScreen key={view} view={view} snapshot={snapshot} secondsToMaturity={snapshot.season.end - MOCK_NOW} />
  );
}

function ClaimSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-3 h-12 w-72 max-w-full" />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Skeleton className="h-96 w-full" label="Loading your claim" />
        <Skeleton className="h-64 w-full" />
      </div>
    </section>
  );
}
