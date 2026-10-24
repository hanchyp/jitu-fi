"use client";

import { useId } from "react";
import { GameActionButton } from "./GameButton";
import { formatMusd, MUSD_DECIMALS, musdToInput } from "@/lib/format";

type AmountInputProps = {
  label: string;
  /** The raw text as typed. Parse it with parseMusd() from src/lib/format.ts. */
  value: string;
  onChange: (value: string) => void;
  /** Wallet balance in 6-decimal units. Shows the balance line and the Max button. */
  max?: bigint;
  /** Inline error: say what happened and what to do, e.g. "Minimum deposit is 10 mUSD." */
  error?: string;
  /** Quiet line under the field when there is no error. */
  hint?: string;
  disabled?: boolean;
  className?: string;
};

// Digits with at most one dot and six decimals; anything else typed is dropped.
const VALID = new RegExp(`^\\d*(\\.\\d{0,${MUSD_DECIMALS}})?$`);

/** The mUSD amount field: big display-font number, unit tag, Max button and an inline error. */
export function AmountInput({ label, value, onChange, max, error, hint, disabled = false, className = "" }: AmountInputProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-extrabold text-white/85">
          {label}
        </label>
        {max !== undefined && <span className="text-sm font-bold text-white/60">Balance {formatMusd(max)}</span>}
      </div>
      <div
        className={`mt-2 flex items-center gap-2 rounded-[16px] border-[3px] bg-dasar py-2 pl-4 pr-2 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-emas ${
          error ? "border-turun" : "border-garis"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          onChange={(e) => {
            const next = e.target.value.replace(/,/g, "");
            if (VALID.test(next)) onChange(next);
          }}
          className="font-display w-0 min-w-0 flex-1 bg-transparent text-3xl text-white tabular-nums outline-none placeholder:text-white/30 focus-visible:outline-none!"
        />
        <span className="font-extrabold text-white/60">mUSD</span>
        {max !== undefined && (
          <GameActionButton variant="night" size="sm" disabled={disabled} onClick={() => onChange(musdToInput(max))}>
            Max
          </GameActionButton>
        )}
      </div>
      {note && (
        <p id={noteId} className={`mt-2 text-sm font-bold ${error ? "text-turun" : "text-white/60"}`}>
          {note}
        </p>
      )}
    </div>
  );
}
