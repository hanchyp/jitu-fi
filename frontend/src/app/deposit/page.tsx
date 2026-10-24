import type { Metadata } from "next";
import { Suspense } from "react";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { DepositScreen } from "@/components/vault/DepositScreen";
import { readDevState, type SearchParams } from "@/lib/dev-state";
import { scenarioFor, STATES } from "./scenarios";

export const metadata: Metadata = {
  title: "Deposit | jitu.fi",
  description: "Lock mUSD into a season. Your principal, base yield and bonus all come back at maturity.",
};

export default function DepositPage({ searchParams }: PageProps<"/deposit">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<DepositSkeleton />}>
        <Deposit searchParams={searchParams} />
      </Suspense>
      <DevStateBar states={STATES} />
    </main>
  );
}

async function Deposit({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = await readDevState(searchParams, STATES);
  // Keyed by state, so switching dev states starts the screen fresh.
  return <DepositScreen key={state} {...scenarioFor(state)} />;
}

function DepositSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Loading deposit">
      <Skeleton className="h-12 w-72 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
