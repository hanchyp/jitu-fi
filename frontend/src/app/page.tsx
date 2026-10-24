import Link from "next/link";
import { BilyetHero } from "@/components/landing/BilyetHero";

const STEPS = [
  {
    title: "Setor",
    body: "Setor mUSD ke musim yang sedang dibuka. Pokokmu terkunci selama tenor dan diparkir di strategi bunga.",
  },
  {
    title: "Main",
    body: "Selama musim berjalan, main Crypto Draft melawan 3 pemain: pilih 3 koin, tebak naik atau turun, kumpulkan poin.",
  },
  {
    title: "Klaim",
    body: "Saat musim selesai, ambil pokok utuh ditambah bunga dasar dan bonus sesuai poinmu.",
  },
] as const;

// Split of every 100 mUSD of yield, from the vault rules (fee 15%, then 50/50).
const SPLIT = [
  { label: "Biaya platform", value: "15", share: 15, tone: "bg-tinta/25", note: "Untuk menjalankan jitu.fi." },
  { label: "Bunga dasar", value: "42,5", share: 42.5, tone: "bg-tinta", note: "Dibagi rata sesuai setoran. Tetap kamu dapat walau kalah." },
  { label: "Pot bonus", value: "42,5", share: 42.5, tone: "bg-guilloche", note: "Dibagi sesuai poin musim dikali bobot setoran (maks. 1.000 mUSD)." },
] as const;

const SEASON_FACTS = [
  { label: "Tenor", value: "30 menit" },
  { label: "Pendaftaran", value: "5 menit pertama" },
  { label: "Setoran minimum", value: "10 mUSD" },
  { label: "Bobot bonus maksimum", value: "1.000 mUSD" },
] as const;

const NEVER = [
  { title: "Tidak ada biaya masuk", body: "Main berapa kali pun tanpa membayar per game." },
  { title: "Pokok tidak dipertaruhkan", body: "Kontrak game tidak punya akses ke dana. Yang diperebutkan hanya pot bonus dari bunga." },
  { title: "Tidak ada undian", body: "Pemenang ditentukan peringkat skor, bukan keberuntungan." },
] as const;

export default function Home() {
  return (
    <>
      <div className="bg-tinta px-4 py-2 text-center text-sm text-kertas">
        <span className="font-semibold">Testnet · simulasi</span>
        <span className="ml-2 text-kertas/70">Bunga disimulasikan, tidak ada dana sungguhan.</span>
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          jitu.fi
        </Link>
        <Link
          href="/deposit"
          className="rounded-[10px] bg-tinta px-4 py-2 text-sm font-semibold text-kertas transition-colors hover:bg-tinta/90 active:translate-y-px"
        >
          Setor mUSD
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-12 pb-20 pt-8 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
          <div className="max-w-xl">
            <h1 className="text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Deposito yang bisa kamu mainkan.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-tinta/75">
              Setor mUSD, pokokmu aman dan bunganya tetap jalan. Selama musim berlangsung, adu tebakan arah harga
              koin. Makin jitu tebakanmu, makin besar bagianmu dari pot bonus.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/deposit"
                className="rounded-[10px] bg-tinta px-5 py-3 font-semibold text-kertas transition-colors hover:bg-tinta/90 active:translate-y-px"
              >
                Setor mUSD
              </Link>
              <a
                href="#cara-kerja"
                className="rounded-[10px] border border-tinta/25 px-5 py-3 font-semibold transition-colors hover:bg-tinta/5"
              >
                Lihat cara kerjanya
              </a>
            </div>
          </div>
          <BilyetHero />
        </section>

        {/* How it works: a real 3-step sequence, so numbering carries information */}
        <section id="cara-kerja" className="scroll-mt-8 border-t border-tinta/15 py-16 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Cara kerja</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="max-w-sm">
                <p className="text-5xl font-extrabold leading-none text-guilloche/80">{i + 1}</p>
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-tinta/75">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Yield split */}
        <section className="border-t border-tinta/15 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ke mana bunganya pergi</h2>
            <p className="mt-4 text-lg leading-relaxed text-tinta/75">
              Dari setiap 100 mUSD bunga yang dihasilkan musim ini:
            </p>
          </div>

          <div className="mt-10 flex h-14 w-full overflow-hidden rounded-[6px]" role="img" aria-label="15 biaya, 42,5 bunga dasar, 42,5 pot bonus">
            {SPLIT.map((part) => (
              <div key={part.label} className={part.tone} style={{ width: `${part.share}%` }} />
            ))}
          </div>

          <dl className="mt-8 grid gap-8 md:grid-cols-[15fr_42.5fr_42.5fr] md:gap-6">
            {SPLIT.map((part) => (
              <div key={part.label}>
                <dt className="font-semibold">{part.label}</dt>
                <dd className="mt-1 text-3xl font-extrabold tracking-tight">{part.value}</dd>
                <dd className="mt-2 max-w-xs text-sm leading-relaxed text-tinta/70">{part.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Season facts. Live status and countdown come from the backend in a later phase. */}
        <section className="border-t border-tinta/15 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div className="max-w-md">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Musim demo</h2>
              <p className="mt-4 text-lg leading-relaxed text-tinta/75">
                Untuk hackathon, satu musim dipersingkat jadi 30 menit supaya kamu bisa merasakan satu putaran penuh:
                setor, main, lalu klaim.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 self-center">
              {SEASON_FACTS.map((fact) => (
                <div key={fact.label} className="border-l-2 border-guilloche/50 pl-4">
                  <dt className="text-sm text-tinta/65">{fact.label}</dt>
                  <dd className="mt-1 text-2xl font-bold tracking-tight">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Guarantees */}
        <section className="border-t border-tinta/15 py-16 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Yang tidak akan pernah terjadi</h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {NEVER.map((item) => (
              <li key={item.title} className="max-w-sm">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-tinta/75">{item.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-14">
            <Link
              href="/deposit"
              className="inline-block rounded-[10px] bg-tinta px-5 py-3 font-semibold text-kertas transition-colors hover:bg-tinta/90 active:translate-y-px"
            >
              Setor mUSD
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-tinta/15">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-tinta/60 sm:px-6">
          <p>jitu.fi berjalan di Monad testnet.</p>
          <p>Dibuat untuk hackathon.</p>
        </div>
      </footer>
    </>
  );
}
