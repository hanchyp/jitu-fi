// Placeholder landing page. The real home route (pitch, 3 steps, season status) lands in Phase 5.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">jitu.fi</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Pokok aman. Tebakan jitu, bunga berlipat.
      </p>
      <p className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-700 dark:text-amber-300">
        Testnet · simulasi
      </p>
    </main>
  );
}
