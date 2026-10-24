import Link from "next/link";
import type { ComponentType } from "react";
import { GameButton } from "@/components/ui/GameButton";
import { CardsIcon, ChestIcon, CoinsIcon, NoTicketIcon, ShieldIcon, TrophyIcon } from "@/components/world/icons";
import { TitleScreen } from "@/components/world/TitleScreen";

const QUESTS: { title: string; body: string; Icon: ComponentType<{ className?: string }>; tilt: string }[] = [
  {
    title: "Setor",
    body: "Titipkan mUSD ke Kristal Pokok selama satu musim. Pokokmu terkunci aman dan mulai berbunga.",
    Icon: ChestIcon,
    tilt: "md:-rotate-2",
  },
  {
    title: "Main",
    body: "Duel 4 pemain, 3 ronde. Pilih 3 koin, tebak naik atau turun, pakai skill, kumpulkan poin.",
    Icon: CardsIcon,
    tilt: "md:rotate-1",
  },
  {
    title: "Klaim",
    body: "Musim selesai, ambil pokok utuh plus bunga dasar dan bonus sesuai poinmu.",
    Icon: CoinsIcon,
    tilt: "md:-rotate-1",
  },
];

// Split of every 100 mUSD of yield, from the vault rules (fee 15%, then 50/50).
const LOOT = [
  { label: "Biaya platform", value: "15", share: 15, bar: "bg-white/30", note: "Untuk menjaga arena tetap jalan." },
  { label: "Bunga dasar", value: "42,5", share: 42.5, bar: "bg-langit", note: "Dibagi rata sesuai setoran. Tetap kamu dapat walau kalah." },
  { label: "Pot bonus", value: "42,5", share: 42.5, bar: "bg-emas", note: "Rebutan pemain: poin musim dikali bobot setoran (maks. 1.000 mUSD)." },
] as const;

const SEASON_STATS = [
  { label: "Tenor", value: "30 menit" },
  { label: "Pendaftaran", value: "5 menit" },
  { label: "Setoran min.", value: "10 mUSD" },
  { label: "Bobot maks.", value: "1.000 mUSD" },
] as const;

const RULES: { title: string; body: string; Icon: ComponentType<{ className?: string }> }[] = [
  { title: "Tanpa tiket masuk", body: "Main sesering apa pun tanpa bayar per game.", Icon: NoTicketIcon },
  { title: "Pokok tak pernah dipertaruhkan", body: "Kontrak game tidak bisa menyentuh dana. Yang diperebutkan hanya pot bonus dari bunga.", Icon: ShieldIcon },
  { title: "Menang karena jitu", body: "Pemenang ditentukan peringkat skor, bukan undian.", Icon: TrophyIcon },
];

function Nav() {
  return (
    <nav className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between gap-3 rounded-[18px] border-[3px] border-garis bg-malam/85 px-3 py-2 backdrop-blur-sm sm:px-4">
      <Link href="/" className="font-display wordmark text-2xl text-emas">
        jitu.fi
      </Link>
      <div className="hidden items-center gap-6 font-extrabold text-white/85 md:flex">
        <a href="#cara-main" className="hover:text-emas">Cara main</a>
        <a href="#bunga" className="hover:text-emas">Bunga</a>
        <a href="#musim" className="hover:text-emas">Musim</a>
      </div>
      <GameButton href="/deposit" className="!px-4 !py-1.5 !text-base">
        Setor mUSD
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
        Testnet · simulasi <span className="font-semibold opacity-75">Bunga disimulasikan, tidak ada dana sungguhan.</span>
      </div>

      <TitleScreen nav={<Nav />} />

      <main className="flex-1">
        {/* Quests */}
        <section id="cara-main" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
          <SectionTitle>Cara main</SectionTitle>
          <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">Tiga misi, satu musim.</p>
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
        <section id="bunga" className="border-y-[3px] border-garis bg-[#0C1A31]">
          <div className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
            <SectionTitle>Pembagian bunga</SectionTitle>
            <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">
              Dari setiap 100 mUSD bunga yang dihasilkan musim ini:
            </p>

            <div
              className="mt-10 flex h-12 w-full overflow-hidden rounded-[14px] border-[3px] border-garis shadow-[0_6px_0_0_#050B14]"
              role="img"
              aria-label="15 biaya platform, 42,5 bunga dasar, 42,5 pot bonus"
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
        <section id="musim" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-[26px] border-[3px] border-garis bg-langit p-6 shadow-[0_8px_0_0_#0B1626] sm:p-10">
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div>
                <p className="font-extrabold text-emas">Musim demo #1</p>
                <h2 className="font-display title-outline mt-1 text-4xl text-white sm:text-5xl">Satu musim, 30 menit</h2>
                <p className="mt-3 max-w-md text-lg font-semibold text-white/85">
                  Untuk hackathon, musim dipersingkat supaya kamu bisa merasakan satu putaran penuh: setor, main, klaim.
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

        {/* Rules of the valley */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <SectionTitle>Aturan arena</SectionTitle>
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
            <h2 className="font-display title-outline text-4xl text-emas sm:text-6xl">Siap masuk arena?</h2>
            <GameButton href="/deposit" size="lg" className="mt-8">
              Main sekarang
            </GameButton>
          </div>
        </section>
      </main>

      <footer className="border-t-[3px] border-garis bg-[#0C1A31]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm font-semibold text-white/60 sm:px-6">
          <p>jitu.fi berjalan di Monad testnet.</p>
          <p>Dibuat untuk hackathon.</p>
        </div>
      </footer>
    </>
  );
}
