import { useId } from "react";
import type { PricePoint } from "./randomWalk";

type Props = {
  points: PricePoint[];
  /** Color override; defaults to the direction from the first to the last point. */
  positive?: boolean;
  /** Size the chart with classes; the stroke stays 1.5 px at any size. */
  className?: string;
  /** Accessible label; without it the sparkline is decorative. */
  label?: string;
};

const W = 100;
const H = 32;
const PAD = 2;

/** Tiny inline price line for CoinCard. Evenly spaced by index. */
export function Sparkline({ points, positive, className = "h-6 w-16", label }: Props) {
  const gradientId = useId();
  const up = positive ?? (points.length < 2 || points[points.length - 1].price >= points[0].price);
  const color = up ? "var(--color-naik)" : "var(--color-turun)";

  let line = "";
  if (points.length >= 2) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of points) {
      lo = Math.min(lo, p.price);
      hi = Math.max(hi, p.price);
    }
    const span = hi - lo || 1;
    line = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * W;
        const y = PAD + (1 - (p.price - lo) / span) * (H - PAD * 2);
        return `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join("");
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`block overflow-visible ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {line && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.35" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line}L${W} ${H}L0 ${H}Z`} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}
