import Image from "next/image";
import Link from "next/link";
import { HowToPlayTrigger } from "@/components/howto/HowToPlay";
import { GameButton } from "@/components/ui/GameButton";
import { TitleScreen } from "@/components/world/TitleScreen";

const ART = "/assets/landing";

const QUESTS = [
  {
    title: "Deposit",
    body: "Lock mUSD in the Principal Crystal for one season. Your principal is never at risk, and it starts earning yield.",
    art: `${ART}/deposit-chest.webp`,
    alt: "A treasure chest with a glowing purple crystal inside",
    tilt: "md:-rotate-2",
  },
  {
    title: "Play",
    body: "Take on 3 house bots. Call Buy or Sell on the coins you trust, cast any of the 6 skills and climb the table.",
    art: `${ART}/play-cards.webp`,
    alt: "A smiling gold coin spirit rising from a stone podium",
    tilt: "md:rotate-1",
  },
  {
    title: "Claim",
    body: "At maturity, take back your full principal plus base yield and a bonus share earned with your season points.",
    art: `${ART}/claim-treasure.webp`,
    alt: "An open chest overflowing with gold coins and a crystal",
    tilt: "md:-rotate-1",
  },
] as const;

// Round counts and the pick cap of each round (DECISIONS.md, game redesign).
const PRESETS = [
  { name: "Quick", caps: [1, 2, 3] },
  { name: "Standard", caps: [1, 1, 2, 2, 3] },
  { name: "Long", caps: [1, 1, 2, 2, 3, 3, 4] },
  { name: "Marathon", caps: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5] },
] as const;

const SKILLS = [
  { name: "BOOST", body: "One pick counts double." },
  { name: "INSURANCE", body: "One pick can't score below 0." },
  { name: "LOCK", body: "Bank a pick's move right now." },
  { name: "FLIP", body: "Turn a Buy into a Sell mid-round." },
  { name: "SWAP", body: "Trade a pick for another coin." },
  { name: "FREEZE", body: "Stop a rival's pick in its tracks." },
] as const;

// Split of every 100 mUSD of yield, from the vault rules (fee 15%, then 50/50).
const LOOT = [
  { label: "Platform fee", value: "15", share: 15, bar: "bg-white/30", note: "Keeps the arena running." },
  { label: "Base yield", value: "42.5", share: 42.5, bar: "bg-langit", note: "Shared by deposit size. You get it even if you lose every game." },
  { label: "Bonus pot", value: "42.5", share: 42.5, bar: "bg-emas", note: "Shared by season points times deposit weight (max 1,000 mUSD). Sponsors can top it up." },
] as const;

const SEASON_STATS = [
  { label: "Season length", value: "15 or 30 min" },
  { label: "Enrollment", value: "2 min" },
  { label: "Games that count", value: "First 2" },
  { label: "Max. weight", value: "1,000 mUSD" },
] as const;

const RULES = [
  {
    title: "No entry fee",
    body: "No buy-in and no tickets. Play as many games as you like; your first games each season earn the points.",
    art: `${ART}/no-entry-fee.webp`,
    alt: "A ticket crossed out with a red slash",
  },
  {
    title: "Principal is never at risk",
    body: "The game contract can't touch funds. Only the bonus from yield is contested, and it all pays out at maturity.",
    art: `${ART}/principal-safe.webp`,
    alt: "A navy shield guarding a purple crystal",
  },
  {
    title: "Skill wins, not luck",
    body: "Winners are ranked by score, never by lottery. The 3 house bots never earn points or touch the bonus pot.",
    art: `${ART}/skill-wins.webp`,
    alt: "A gold trophy with a small crown",
  },
] as const;

function Nav() {
  return (
    <nav className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between gap-3 rounded-[18px] border-[3px] border-garis bg-malam/85 px-3 py-2 backdrop-blur-sm sm:px-4">
      {/* Horizontal lockup built from the crest and wordmark crops of the logo. */}
      <Link href="/" aria-label="jitu.fi home" className="flex shrink-0 items-center gap-1.5 rounded-[10px]">
        <Image src="/brand/jitu-crest.webp" alt="" width={36} height={40} loading="eager" className="h-10 w-9 object-contain" />
        <Image src="/brand/jitu-wordmark.webp" alt="" width={77} height={34} loading="eager" className="h-[34px] w-[77px]" />
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
  return <h2 className="font-display title-outline text-4xl text-gading sm:text-5xl">{children}</h2>;
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
            {QUESTS.map(({ title, body, art, alt, tilt }, i) => (
              <li
                key={title}
                className={`relative rounded-[22px] border-[3px] border-garis bg-papan p-6 shadow-[0_8px_0_0_#040B10] ${tilt}`}
              >
                <span className="font-display absolute -left-3 -top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-garis bg-emas text-xl text-garis">
                  {i + 1}
                </span>
                <Image src={art} alt={alt} width={512} height={512} sizes="128px" className="-my-2 h-32 w-32" />
                <h3 className="font-display mt-2 text-3xl text-emas">{title}</h3>
                <p className="mt-2 text-[17px] font-semibold leading-relaxed text-white/80">{body}</p>
              </li>
            ))}
          </ol>

          {/* The game in two boards: how long a game runs, and what you can cast. */}
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[22px] border-[3px] border-garis bg-malam p-5 shadow-[0_6px_0_0_#040B10] sm:p-6">
              <h3 className="font-display text-2xl text-gading">Pick your game length</h3>
              <p className="mt-1 font-semibold leading-relaxed text-white/70">
                Each round lets you pick a few more coins than the last. Fewer picks means more confidence: your round
                score is the cap times the average return of your calls.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <li key={preset.name} className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2">
                    <p className="font-extrabold text-white">
                      {preset.name} <span className="font-display text-xl text-emas">{preset.caps.length}</span>
                      <span className="text-sm text-white/60"> rounds</span>
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1" aria-label={`Pick caps ${preset.caps.join(", ")}`}>
                      {preset.caps.map((cap, i) => (
                        <span
                          key={i}
                          className="font-display flex h-6 min-w-6 items-center justify-center rounded-[7px] border-2 border-garis bg-emas px-1 text-sm text-garis"
                          style={{ opacity: 0.55 + (cap / 5) * 0.45 }}
                        >
                          {cap}
                        </span>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-bold text-white/55">
                Rounds: 20 s commit, 10 s reveal, 60–120 s live on real prices. Moves under 1 bps don&apos;t count.
              </p>
            </div>

            <div className="rounded-[22px] border-[3px] border-garis bg-malam p-5 shadow-[0_6px_0_0_#040B10] sm:p-6">
              <h3 className="font-display text-2xl text-gading">Cast a skill</h3>
              <p className="mt-1 font-semibold leading-relaxed text-white/70">
                All 6 skills are open to every player, bots included. Use at most one per round, so pick your
                moment.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SKILLS.map((skill) => (
                  <li key={skill.name} className="rounded-[14px] border-[3px] border-garis bg-dasar px-3 py-2">
                    <p className="font-display text-lg text-zamrud">{skill.name}</p>
                    <p className="text-sm font-semibold leading-snug text-white/75">{skill.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Loot split */}
        <section id="yield" className="border-y-[3px] border-garis">
          <div className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
            <SectionTitle>Where the yield goes</SectionTitle>
            <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">
              For every 100 mUSD of yield earned this season, all paid out at maturity:
            </p>

            <div
              className="mt-10 flex h-12 w-full overflow-hidden rounded-[14px] border-[3px] border-garis shadow-[0_6px_0_0_#040B10]"
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
          <div className="relative overflow-hidden rounded-[26px] border-[3px] border-garis bg-malam p-6 shadow-[0_8px_0_0_#040B10] sm:p-10">
            <Image
              src={`${ART}/season-banner.webp`}
              alt=""
              fill
              sizes="(min-width: 1152px) 1104px, 100vw"
              className="object-cover object-[70%_center]"
            />
            {/* Dark overlay, heaviest under the copy on the left, so text stays readable. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,34,53,0.86),rgba(10,34,53,0.6))] lg:bg-[linear-gradient(to_right,rgba(10,34,53,0.92)_0%,rgba(10,34,53,0.7)_45%,rgba(10,34,53,0.3)_100%)]"
            />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div>
                <p className="font-extrabold text-emas">Demo season #1</p>
                <h2 className="font-display title-outline mt-1 text-4xl text-gading sm:text-5xl">A season in minutes</h2>
                <p className="mt-3 max-w-md text-lg font-semibold text-white/85">
                  A real season lasts a week or a month. For the hackathon it lasts 15 or 30 minutes, so you can play
                  the whole cycle: deposit, play, claim at maturity.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:gap-4">
                {SEASON_STATS.map((stat) => (
                  <div key={stat.label} className="rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3">
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
            {RULES.map(({ title, body, art, alt }) => (
              <li key={title} className="flex gap-4">
                <Image src={art} alt={alt} width={256} height={256} sizes="80px" className="h-20 w-20 shrink-0" />
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

      <footer className="border-t-[3px] border-garis bg-dasar">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm font-semibold text-white/60 sm:px-6">
          <p>jitu.fi runs on Monad testnet.</p>
          <p>Built for a hackathon.</p>
        </div>
      </footer>
    </>
  );
}
