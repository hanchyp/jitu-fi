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
              Protected from game losses
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
              Returned principal, base yield and your bonus share are claimable together when the season ends.
            </p>
          </li>
          <li className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2">
            <p className="font-extrabold text-white">A losing streak still pays</p>
            <p className="font-semibold leading-relaxed text-white/75">
              Game losses never reduce your principal or base yield. Strategy losses can reduce principal; only the bonus depends on your games.
            </p>
          </li>
        </ul>
      </Board>
    </section>
  );
}
