import { Skeleton } from "@/components/ui/Skeleton";

/** Static loading layouts (no pulse) for /leaderboard and /profile, also used as Suspense fallbacks. */
export function LeaderboardSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" aria-label="Loading the leaderboard" aria-busy="true">
      <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Hall of fame</h1>
      <p role="status" className="mt-2 font-semibold text-white/75">Gathering the season standings…</p>
      <Skeleton className="mt-6 h-14 w-56" />
      <Skeleton className="mt-4 h-8 w-52" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex h-80 items-end gap-3 rounded-[22px] border-[3px] border-garis bg-dasar px-4 pt-8 sm:px-6" aria-hidden="true">
          <Skeleton className="h-40 flex-1" />
          <Skeleton className="h-56 flex-1" />
          <Skeleton className="h-32 flex-1" />
        </div>
        <div className="space-y-5 rounded-[22px] border-[3px] border-garis bg-papan p-5 sm:p-6" aria-hidden="true">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-10 w-40 max-w-full" />
        </div>
      </div>
      <div className="mt-9 space-y-2" aria-hidden="true">
        <Skeleton className="h-8 w-36" />
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-3 h-12 w-64 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="col-span-2 h-22 sm:col-span-1" label="Loading your games" />
        <Skeleton className="h-22" />
        <Skeleton className="h-22" />
      </div>
      <div className="mt-6 space-y-3 rounded-[22px] border-[3px] border-garis bg-malam p-5 shadow-[0_6px_0_0_#040B10] sm:p-6">
        <Skeleton className="h-7 w-40" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </section>
  );
}
