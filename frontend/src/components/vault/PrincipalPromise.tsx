import Image from "next/image";
import { Board } from "@/components/ui/Board";

const ART = "/assets/landing";

/** The plain promise next to every deposit: what comes back, when, and what a losing streak costs. */
export function PrincipalPromise() {
  return (
    <section aria-labelledby="promise-title">
      <Board>
        <div className="flex items-start gap-4">
          <Image src={`${ART}/principal-safe.webp`} alt="" width={256} height={256} sizes="80px" className="h-20 w-20 shrink-0" />
          <div>
            <h2 id="promise-title" className="font-display text-2xl text-gading">
              Your principal comes back
            </h2>
            <p className="mt-1 font-semibold leading-relaxed text-white/75">
              It sits in the Principal Crystal all season. The game contract can&apos;t touch it.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          <li className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2">
            <p className="font-extrabold text-white">Everything pays at maturity</p>
            <p className="font-semibold leading-relaxed text-white/75">
              Principal, base yield and your bonus share all arrive together when the season ends.
            </p>
          </li>
          <li className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2">
            <p className="font-extrabold text-white">A losing streak still pays</p>
            <p className="font-semibold leading-relaxed text-white/75">
              Lose every game and you still get your principal plus base yield. Only the bonus is up for grabs.
            </p>
          </li>
        </ul>
      </Board>
    </section>
  );
}
