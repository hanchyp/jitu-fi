"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown, formatSeconds } from "@/lib/format";

type CountdownProps = {
  /** Seconds left. With `ticking`, counting starts from this value and restarts when it changes. */
  seconds: number;
  /** "clock" -> 09:05 (season, enrollment); "seconds" -> 87s (round phases). */
  format?: "clock" | "seconds";
  /** Counts down locally once per second (dummy data has no server clock yet). */
  ticking?: boolean;
  /** At or below this many seconds the pill flips to gold, so the deadline stands out. */
  urgentAt?: number;
  /** What the timer is counting to, e.g. "Enrollment closes in". Shown before the time. */
  label?: string;
  onDone?: () => void;
  className?: string;
};

/** A timer pill. Not an animation: under reduced motion it still counts, since it is information. */
export function Countdown({ seconds, format = "clock", ticking = false, urgentAt, label, onDone, className = "" }: CountdownProps) {
  const [start, setStart] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  // Restart when the caller passes a new value (React's "adjust state on prop change" pattern).
  if (start !== seconds) {
    setStart(seconds);
    setLeft(seconds);
  }

  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking, start]);

  const shown = ticking ? left : seconds;
  useEffect(() => {
    if (ticking && shown === 0) done.current?.();
  }, [ticking, shown]);

  const text = format === "seconds" ? formatSeconds(shown) : formatCountdown(shown);
  const urgent = urgentAt !== undefined && shown > 0 && shown <= urgentAt;
  const finished = shown === 0;

  return (
    <span className={`inline-flex items-center gap-2 font-extrabold text-white/75 ${className}`}>
      {label && <span>{label}</span>}
      <span
        role="timer"
        aria-label={label ? `${label} ${text}` : text}
        className={`font-display rounded-[14px] border-[3px] border-garis px-2.5 py-0.5 text-xl tabular-nums ${
          urgent ? "bg-emas text-garis" : finished ? "bg-dasar text-white/55" : "bg-dasar text-emas"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
