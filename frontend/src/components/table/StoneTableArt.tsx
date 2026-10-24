// A flat illustrated version of the landing arena: cut-stone rim, rune ring and
// a cracked slate playing surface. No canvas or WebGL is needed in-game.
const INK = "var(--color-garis)";
const STONE = "var(--color-arena-stone)";
const STONE_DARK = "var(--color-arena-stone-dark)";
// Flat facets: three tones of the same stone, no surface gradient.
const FACETS = [`color-mix(in srgb, ${STONE} 88%, var(--color-gading))`, STONE, `color-mix(in srgb, ${STONE} 82%, ${INK})`];

export function StoneTableArt() {
  function point(angle: number, rx: number, ry: number) {
    // Round so server and client float output match during hydration.
    return `${(500 + Math.cos(angle) * rx).toFixed(2)},${(285 + Math.sin(angle) * ry).toFixed(2)}`;
  }
  return <svg className="jitu-table-stoneArt" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <ellipse cx="500" cy="320" rx="485" ry="268" fill={INK} />
    <ellipse cx="500" cy="304" rx="480" ry="265" style={{ fill: `color-mix(in srgb, ${STONE_DARK} 62%, ${INK})` }} stroke={INK} strokeWidth="5" />
    <ellipse cx="500" cy="285" rx="475" ry="258" fill={STONE_DARK} stroke={INK} strokeWidth="5" />
    <ellipse cx="500" cy="285" rx="418" ry="208" fill={STONE_DARK} stroke={INK} strokeWidth="5" />
    <g fill="none" stroke={INK} strokeWidth="3" opacity=".3"><path d="m120 280 116-18 61 32 125-12m-81-184 17 64-25 21 12 48m310-126-19 60 32 20-22 57m216 73-74-23-75 23-43-12M370 470l-14-64 42-29m253 98-18-51 33-38" /><path d="m124 380 65-9 17 21m591-240-49 15-12-25" /></g>
    <ellipse cx="500" cy="285" rx="391" ry="186" fill="none" stroke="var(--color-kristal)" strokeWidth="2" opacity=".5" />
    {Array.from({ length: 28 }, (_, index) => {
      const angle = index / 28 * Math.PI * 2;
      const end = (index + 1) / 28 * Math.PI * 2 - .014;
      // Light falls from the upper left, so only those stones carry a bright lip.
      const lit = Math.sin(angle) < 0 && Math.cos(angle) < .4;
      return <g key={index}><path d={`M${point(angle, 474, 257)} L${point(end, 474, 257)} L${point(end, 428, 218)} L${point(angle, 428, 218)}Z`} style={{ fill: FACETS[index % 3] }} stroke={INK} strokeWidth="3" /><path d={`M${point(angle + .025, 464, 249)} L${point(end - .025, 464, 249)}`} fill="none" stroke="var(--color-gading)" strokeWidth="3" opacity={lit ? .4 : .12} /></g>;
    })}
    {Array.from({ length: 16 }, (_, index) => {
      const angle = index / 16 * Math.PI * 2;
      return <path key={index} d={`M${point(angle - .025, 397, 193)} L${point(angle, 383, 180)} L${point(angle + .025, 397, 193)}`} fill="none" stroke="var(--color-kristal-terang)" strokeWidth="3" opacity=".5" />;
    })}
  </svg>;
}
