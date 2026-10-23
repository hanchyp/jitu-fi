import Image from "next/image";
import { CARD_BACK, CARD_FRAME, SKILLS, skillArt } from "./info";
import type { SkillName } from "./types";

// Positions inside card-frame.webp (640 × 896), from ASSETS.md: the transparent art window and the
// blank ivory name plate.
const WINDOW = "left-[10.6%] right-[10.5%] top-[12.8%] bottom-[33.5%]";
const PLATE = "left-[12%] right-[12%] top-[79.5%] bottom-[10.5%]";
const SIZES = "(min-width: 640px) 160px, 30vw";

/** A skill card face: illustration in the gold frame, name on the plate, timing on the band. */
export function SkillCardFace({ skill, className = "" }: { skill: SkillName; className?: string }) {
  const { timing } = SKILLS[skill];
  return (
    <span className={`relative block aspect-[5/7] w-full select-none ${className}`}>
      <span className={`absolute ${WINDOW} rounded-[6%] bg-dasar p-[4%]`}>
        <Image src={skillArt(skill)} alt="" width={512} height={512} sizes={SIZES} className="h-full w-full object-contain" />
      </span>
      <Image src={CARD_FRAME} alt="" fill sizes={SIZES} className="object-contain" />
      <span className="absolute inset-x-0 top-[68.5%] text-center text-[clamp(9px,2.6vw,12px)] font-extrabold leading-none text-white/75">
        {timing === "commit" ? "At commit" : "In Live"}
      </span>
      <span className={`absolute ${PLATE} flex items-center justify-center`}>
        <span className="font-display text-[clamp(11px,3.4vw,17px)] leading-none text-garis">{skill}</span>
      </span>
    </span>
  );
}

/** A hidden card: an opponent's hand, or a card still being dealt. */
export function SkillCardBack({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block aspect-[5/7] w-full ${className}`}>
      <Image src={CARD_BACK} alt="" fill sizes="64px" className="object-contain" />
    </span>
  );
}

/** A rival's hand as card backs: how many skills they hold, never which. */
export function HiddenHand({ name, count, className = "" }: { name: string; count: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-extrabold text-white/75">{name}</span>
      <span className="flex" aria-label={`${count} ${count === 1 ? "skill" : "skills"} in hand`}>
        {count === 0 ? (
          <span className="text-sm font-bold text-white/55">No skills</span>
        ) : (
          Array.from({ length: count }, (_, i) => <SkillCardBack key={i} className={`!w-7 ${i ? "-ml-3" : ""}`} />)
        )}
      </span>
    </div>
  );
}
