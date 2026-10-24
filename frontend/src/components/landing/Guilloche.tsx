// Deterministic guilloche rosette, like the security line work on a printed deposit certificate.
// Pure math (no randomness) so it renders identically on server and client.

type GuillocheProps = {
  size?: number;
  lines?: number;
  petals?: number;
  className?: string;
};

function rosettePath(cx: number, cy: number, base: number, amp: number, petals: number, phase: number) {
  const steps = 360;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = base + amp * Math.sin(petals * t + phase);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

export function Guilloche({ size = 320, lines = 14, petals = 9, className }: GuillocheProps) {
  const c = size / 2;
  const paths = Array.from({ length: lines }, (_, i) =>
    rosettePath(c, c, size * 0.3 + i * (size * 0.012), size * 0.06, petals, (i * Math.PI) / lines),
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.6}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
