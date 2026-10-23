import type { Metadata } from "next";
import { Suspense } from "react";
import { statsArt } from "@/components/stats/art";
import { ProfileScreen } from "@/components/stats/ProfileScreen";
import { ProfileSkeleton } from "@/components/stats/StatsSkeletons";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { readDevState, type SearchParams } from "@/lib/dev-state";
import { PROFILE, PROFILE_EMPTY } from "@/mocks/profile";

export const metadata: Metadata = {
  title: "Profile | jitu.fi",
};

const STATES = ["default", "empty", "loading"] as const;

const EMPTY_ART = statsArt("empty-profile.webp");

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile searchParams={searchParams} />
      </Suspense>
      <DevStateBar states={STATES} />
    </main>
  );
}

async function Profile({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const state = await readDevState(searchParams, STATES);
  if (state === "loading") return <ProfileSkeleton />;
  return <ProfileScreen key={state} profile={state === "empty" ? PROFILE_EMPTY : PROFILE} emptyArt={EMPTY_ART} />;
}
