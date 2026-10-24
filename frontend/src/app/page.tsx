import Link from "next/link";
import type { ComponentType } from "react";
import { HowToPlayTrigger } from "@/components/howto/HowToPlay";
import { GameButton } from "@/components/ui/GameButton";
import { CardsIcon, ChestIcon, CoinsIcon, NoTicketIcon, ShieldIcon, TrophyIcon } from "@/components/world/icons";
import { TitleScreen } from "@/components/world/TitleScreen";

const QUESTS: { title: string; body: string; Icon: ComponentType<{ className?: string }>; tilt: string }[] = [
  {
    title: "Deposit",
    body: "Lock mUSD into the Principal Crystal for one season. Your principal stays safe and starts earning yield.",
    Icon: ChestIcon,
    tilt: "md:-rotate-2",
  },
  {
    title: "Play",
    body: "4-player duels, 3 rounds. Pick 3 coins, call up or down, use skills, and collect points.",
    Icon: CardsIcon,
    tilt: "md:rotate-1",
  },
  {
    title: "Claim",
    body: "When the season ends, take back your full principal plus base yield and a bonus based on your points.",
    Icon: CoinsIcon,
    tilt: "md:-rotate-1",
  },
];

// Split of every 100 mUSD of yield, from the vault rules (fee 15%, then 50/50).
const LOOT = [
  { label: "Platform fee", value: "15", share: 15, bar: "bg-white/30", note: "Keeps the arena running." },
  { label: "Base yield", value: "42.5", share: 42.5, bar: "bg-langit", note: "Shared by deposit size. You get it even if you lose." },
  { label: "Bonus pot", value: "42.5", share: 42.5, bar: "bg-emas", note: "Up for grabs: season points times deposit weight (max 1,000 mUSD)." },
] as const;

const SEASON_STATS = [
  { label: "Lock period", value: "30 min" },
  { label: "Enrollment", value: "5 min" },
  { label: "Min. deposit", value: "10 mUSD" },
  { label: "Max. weight", value: "1,000 mUSD" },
] as const;

const RULES: { title: string; body: string; Icon: ComponentType<{ className?: string }> }[] = [
  { title: "No entry fee", body: "Play as often as you like without paying per game.", Icon: NoTicketIcon },
  { title: "Principal is never at stake", body: "The game contract can't touch funds. Only the bonus pot from yield is contested.", Icon: ShieldIcon },
  { title: "Win with sharp calls", body: "Winners are decided by score ranking, never by lottery.", Icon: TrophyIcon },
];

function Nav() {
  return (
    <nav className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between gap-3 rounded-[18px] border-[3px] border-garis bg-malam/85 px-3 py-2 backdrop-blur-sm sm:px-4">
      <Link href="/" className="font-display wordmark text-2xl text-emas">
        jitu.fi
      </Link>
      <div className="hidden items-center gap-6 font-extrabold text-white/85 md:flex">
        <HowToPlayTrigger look="link" className="font-extrabold hover:text-emas">
          How to play
        </HowToPlayTrigger>
        <a href="#yield" className="hover:text-emas">Yield</a>
        <a href="#season" className="hover:text-emas">Season</a>
      </div>
      <GameButton href="/deposit" className="!px-4 !py-1.5 !text-base">
        Deposit mUSD
      </GameButton>
    </nav>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-display title-outline text-4xl text-white sm:text-5xl">{children}</h2>;
}

export default function Home() {
  return (
    <>
      <div className="relative z-30 border-b-[3px] border-garis bg-emas px-4 py-1.5 text-center text-sm font-extrabold text-garis">
        Testnet · simulation <span className="font-semibold opacity-75">Yield is simulated. No real funds.</span>
      </div>

      <TitleScreen nav={<Nav />} />

      <main className="flex-1">
        {/* Quests */}
        <section id="how-to-play" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
          <SectionTitle>How to play</SectionTitle>
          <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">Three quests, one season.</p>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {QUESTS.map(({ title, body, Icon, tilt }, i) => (
              <li
                key={title}
                className={`relative rounded-[22px] border-[3px] border-garis bg-[#183056] p-6 shadow-[0_8px_0_0_#0B1626] ${tilt}`}
              >
                <span className="font-display absolute -left-3 -top-4 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-garis bg-emas text-xl text-garis">
                  {i + 1}
                </span>
                <Icon className="h-20 w-20" />
                <h3 className="font-display mt-4 text-3xl text-emas">{title}</h3>
                <p className="mt-2 text-[17px] font-semibold leading-relaxed text-white/80">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Loot split */}
        <section id="yield" className="border-y-[3px] border-garis bg-[#0C1A31]">
          <div className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
            <SectionTitle>Where the yield goes</SectionTitle>
            <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">
              For every 100 mUSD of yield earned this season:
            </p>

            <div
              className="mt-10 flex h-12 w-full overflow-hidden rounded-[14px] border-[3px] border-garis shadow-[0_6px_0_0_#050B14]"
              role="img"
              aria-label="15 platform fee, 42.5 base yield, 42.5 bonus pot"
            >
              {LOOT.map((part, i) => (
                <div
                  key={part.label}
                  className={`${part.bar} ${i > 0 ? "border-l-[3px] border-garis" : ""} shadow-[inset_0_5px_0_0_rgb(255_255_255/0.25)]`}
                  style={{ width: `${part.share}%` }}
                />
              ))}
            </div>

            <dl className="mt-8 grid gap-8 md:grid-cols-[15fr_42.5fr_42.5fr] md:gap-0 md:[&>div]:pr-6">
              {LOOT.map((part) => (
                <div key={part.label}>
                  <dt className="font-extrabold text-white/80">{part.label}</dt>
                  <dd className="font-display mt-1 text-5xl text-white">{part.value}</dd>
                  <dd className="mt-2 max-w-xs font-semibold leading-relaxed text-white/70">{part.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Season banner. Live status and countdown come from the backend in a later phase. */}
        <section id="season" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[26px] border-[3px] border-garis bg-langit p-6 shadow-[0_8px_0_0_#0B1626] sm:p-10">
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div>
                <p className="font-extrabold text-emas">Demo season #1</p>
                <h2 className="font-display title-outline mt-1 text-4xl text-white sm:text-5xl">One season, 30 minutes</h2>
                <p className="mt-3 max-w-md text-lg font-semibold text-white/85">
                  For the hackathon, a season is shortened so you can play a full cycle: deposit, play, claim.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:gap-4">
                {SEASON_STATS.map((stat) => (
                  <div key={stat.label} className="rounded-[16px] border-[3px] border-garis bg-malam px-4 py-3">
                    <dt className="text-sm font-extrabold text-white/70">{stat.label}</dt>
                    <dd className="font-display mt-0.5 text-2xl text-emas sm:text-3xl">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Arena rules */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <SectionTitle>Arena rules</SectionTitle>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {RULES.map(({ title, body, Icon }) => (
              <li key={title} className="flex gap-4">
                <Icon className="h-16 w-16 shrink-0" />
                <div>
                  <h3 className="text-xl font-black text-white">{title}</h3>
                  <p className="mt-1 font-semibold leading-relaxed text-white/75">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-20 flex flex-col items-center text-center">
            <h2 className="font-display title-outline text-4xl text-emas sm:text-6xl">Ready to enter the arena?</h2>
            <GameButton href="/deposit" size="lg" className="mt-8">
              Play now
            </GameButton>
          </div>
        </section>
      </main>

      <footer className="border-t-[3px] border-garis bg-[#0C1A31]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm font-semibold text-white/60 sm:px-6">
          <p>jitu.fi runs on Monad testnet.</p>
          <p>Built for a hackathon.</p>
        </div>
      </footer>
    </>
  );
}
