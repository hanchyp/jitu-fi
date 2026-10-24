// A flat illustrated version of the landing arena: cut-stone rim, rune ring and
// a cracked slate playing surface. No canvas or WebGL is needed in-game.
export function StoneTableArt() {
  function point(angle: number, rx: number, ry: number) {
    return `${500 + Math.cos(angle) * rx},${285 + Math.sin(angle) * ry}`;
  }
  return <svg className="jitu-table-stoneArt" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <ellipse cx="500" cy="320" rx="485" ry="268" fill="#040b10" />
    <ellipse cx="500" cy="304" rx="480" ry="265" fill="#263349" stroke="#040b10" strokeWidth="5" />
    <ellipse cx="500" cy="285" rx="475" ry="258" fill="#4a5373" stroke="#040b10" strokeWidth="5" />
    <ellipse cx="500" cy="285" rx="418" ry="208" fill="#59647f" stroke="#263349" strokeWidth="5" />
    <g fill="none" stroke="#263349" strokeWidth="3" opacity=".5"><path d="m120 280 116-18 61 32 125-12m-81-184 17 64-25 21 12 48m310-126-19 60 32 20-22 57m216 73-74-23-75 23-43-12M370 470l-14-64 42-29m253 98-18-51 33-38" /><path d="m124 380 65-9 17 21m591-240-49 15-12-25" /></g>
    <ellipse cx="500" cy="285" rx="391" ry="186" fill="none" stroke="#836ef9" strokeWidth="2" opacity=".65" />
    {Array.from({ length: 28 }, (_, index) => {
      const angle = index / 28 * Math.PI * 2;
      const end = (index + 1) / 28 * Math.PI * 2 - .014;
      return <g key={index}><path d={`M${point(angle, 474, 257)} L${point(end, 474, 257)} L${point(end, 428, 218)} L${point(angle, 428, 218)}Z`} fill={index % 3 === 0 ? "#9aa3c2" : index % 3 === 1 ? "#7c86a8" : "#697590"} stroke="#040b10" strokeWidth="3" /><path d={`M${point(angle + .025, 464, 249)} L${point(end - .025, 464, 249)}`} fill="none" stroke="#b1bad1" strokeWidth="3" opacity=".55" /></g>;
    })}
    {Array.from({ length: 16 }, (_, index) => {
      const angle = index / 16 * Math.PI * 2;
      return <path key={index} d={`M${point(angle - .025, 397, 193)} L${point(angle, 383, 180)} L${point(angle + .025, 397, 193)}`} fill="none" stroke="#c4b8ff" strokeWidth="3" opacity=".65" />;
    })}
  </svg>;
}
