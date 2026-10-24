"use client";

import { Countdown } from "@/components/ui/Countdown";
import { formatMusd } from "@/lib/format";
import type { Tenor, TenorOption } from "./types";

type TenorPickerProps = {
  options: TenorOption[];
  value: Tenor;
  onChange: (tenor: Tenor) => void;
  /** Tenors whose enrollment has closed (from the data, or a countdown that ran out here). */
  closed: ReadonlySet<Tenor>;
  onEnrollmentEnd: (tenor: Tenor) => void;
  /** The tenor the player already holds a position in, if any. */
  heldTenor?: Tenor;
  disabled?: boolean;
};

/**
 * The screen's focal choice: two season boards as a radio group. Native radios give arrow-key
 * movement for free; the board shows the focus ring and the gold "selected" ring.
 */
export function TenorPicker({ options, value, onChange, closed, onEnrollmentEnd, heldTenor, disabled = false }: TenorPickerProps) {
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <legend className="sr-only">Season length</legend>
      {options.map((option) => {
        const selected = option.tenor === value;
        const isClosed = closed.has(option.tenor);
        return (
          <label
            key={option.tenor}
            className={`relative block cursor-pointer rounded-[16px] border-[3px] border-garis px-4 pb-4 pt-3 shadow-[0_4px_0_0_#040B10] transition-[background-color] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[6px] has-[:focus-visible]:outline-emas has-[:disabled]:cursor-default ${
              selected ? "bg-papan-terang ring-[3px] ring-emas" : "bg-papan hover:bg-papan-terang"
            }`}
          >
            <input
              type="radio"
              name="tenor"
              value={option.tenor}
              checked={selected}
              onChange={() => onChange(option.tenor)}
              aria-label={`${option.label}, ${option.demoMinutes} minutes in the demo`}
              aria-describedby={`tenor-${option.tenor}-details`}
              className="sr-only"
            />
            {heldTenor === option.tenor && (
              <span className="font-display absolute -top-3 right-3 rounded-[7px] border-2 border-garis bg-emas px-1.5 text-sm text-garis">
                Your season
              </span>
            )}
            <span className="font-display block text-3xl text-white">{option.label}</span>
            <span className="block font-extrabold text-white/75">{option.demoMinutes} minutes in the demo</span>

            <span id={`tenor-${option.tenor}-details`} className="mt-3 block">
              {isClosed ? (
                <span className="font-display inline-block rounded-[14px] border-[3px] border-garis bg-dasar px-2.5 py-0.5 text-lg text-white/60">
                  Enrollment closed
                </span>
              ) : (
                <Countdown
                  seconds={option.enrollSecondsLeft}
                  label="Enrollment closes in"
                  ticking
                  urgentAt={30}
                  onDone={() => onEnrollmentEnd(option.tenor)}
                  className="text-sm"
                />
              )}
              <span className="mt-3 block border-t-[3px] border-garis pt-3">
                <span className="block text-sm font-extrabold text-white/70">Bonus pot</span>
                <span className="font-display block text-2xl text-emas tabular-nums">{formatMusd(option.bonusPot)}</span>
                <span className="block text-sm font-bold text-white/55">
                  Includes {formatMusd(option.sponsorFunds)} from sponsors
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
