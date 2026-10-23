import { Skeleton } from "@/components/ui/Skeleton";

/** Static loading layouts (no pulse) for /leaderboard and /profile, also used as Suspense fallbacks. */
export function LeaderboardSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Skeleton className="h-12 w-64 max-w-full" />
      <Skeleton className="mt-3 h-6 w-full max-w-xl" />
      <Skeleton className="mt-8 h-11 w-56" />
      <div className="mt-4 space-y-2 rounded-[22px] border-[3px] border-garis bg-malam p-5 shadow-[0_6px_0_0_#040B10] sm:p-6">
        <Skeleton className="h-7 w-48" label="Loading the leaderboard" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
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
