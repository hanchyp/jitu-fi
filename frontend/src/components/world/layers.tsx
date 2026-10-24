// Original vector art for the Lembah Jitu title screen. Every layer shares one 1600x900 viewBox
// so the layers line up exactly and can each be moved separately for parallax.

import type { ReactNode } from "react";

const OUTLINE = "#0B1626";

function Layer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      className={`absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Fixed star positions (no randomness, so server and client render the same).
const STARS = [
  [120, 60], [260, 130], [410, 40], [540, 110], [690, 70], [930, 50], [1060, 120], [1180, 40],
  [1310, 100], [1450, 60], [1530, 150], [80, 190], [360, 210], [1240, 200], [1500, 240], [610, 180],
] as const;

export function SkyLayer() {
  return (
    <Layer>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13284F" />
          <stop offset="0.38" stopColor="#2A5C9A" />
          <stop offset="0.62" stopColor="#7FA8D6" />
          <stop offset="0.74" stopColor="#F6B26B" />
          <stop offset="0.86" stopColor="#FAD7A0" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF1C9" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFD58A" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F6B26B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.6} fill="#FFFFFF" opacity={0.55} />
      ))}
      <circle cx="800" cy="610" r="330" fill="url(#sun-glow)" />
      <circle cx="800" cy="612" r="74" fill="#FFE7AE" />
    </Layer>
  );
}

function Cloud({ x, y, s = 1, opacity = 0.9 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity} fill="#FFF7EA">
      <ellipse cx="0" cy="0" rx="90" ry="34" />
      <circle cx="-40" cy="-18" r="38" />
      <circle cx="18" cy="-34" r="48" />
      <circle cx="66" cy="-12" r="32" />
    </g>
  );
}

export function CloudLayer() {
  return (
    <Layer>
      <Cloud x={290} y={270} s={1.1} />
      <Cloud x={1290} y={215} s={1.3} />
      <Cloud x={1040} y={360} s={0.6} opacity={0.7} />
      <Cloud x={520} y={400} s={0.5} opacity={0.6} />
    </Layer>
  );
}

export function FarMountainLayer() {
  return (
    <Layer>
      <defs>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6C38A" stopOpacity="0" />
          <stop offset="1" stopColor="#F6C38A" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M0 640 L140 480 L240 560 L360 405 L470 520 L560 455 L650 540 L760 480 L900 560 L1010 425 L1120 520 L1230 395 L1350 510 L1460 450 L1600 560 L1600 900 L0 900 Z"
        fill="#6F84B6"
      />
      <path d="M326 448 L360 405 L394 450 L376 441 L360 455 L344 441 Z" fill="#EAF0FA" />
      <path d="M978 466 L1010 425 L1044 468 L1026 459 L1010 472 L994 459 Z" fill="#EAF0FA" />
      <path d="M1196 438 L1230 395 L1266 440 L1247 431 L1230 446 L1214 431 Z" fill="#EAF0FA" />
      <rect y="440" width="1600" height="460" fill="url(#haze)" />
    </Layer>
  );
}

function MiniStupa({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M-13 0 C-13 -20 13 -20 13 0 Z" fill="#B3A8CF" />
      <path d="M-2 -17 L0 -30 L2 -17 Z" fill="#B3A8CF" />
    </g>
  );
}

export function CandiLayer() {
  return (
    <Layer>
      <defs>
        <radialGradient id="candi-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE08A" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFC93C" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Mid hills */}
      <path
        d="M0 700 C200 620 380 640 560 650 C680 600 740 565 800 560 C860 565 920 600 1040 650 C1220 640 1400 610 1600 680 L1600 900 L0 900 Z"
        fill="#4E9A5B"
        stroke={OUTLINE}
        strokeWidth="3"
      />
      <path
        d="M560 650 C680 600 740 565 800 560 C860 565 920 600 1040 650"
        fill="none"
        stroke="#86CC74"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* River from the candi down the valley */}
      <path
        d="M792 600 C760 650 862 690 822 742 C782 792 700 822 760 900 L866 900 C826 830 906 792 884 742 C862 690 822 650 812 600 Z"
        fill="#8FD3F4"
        stroke={OUTLINE}
        strokeWidth="2.5"
      />
      <path d="M806 640 C800 660 830 680 826 700" fill="none" stroke="#E6F7FF" strokeWidth="4" strokeLinecap="round" />

      {/* Candi Pokok: the stupa vault that holds everyone's principal */}
      <g data-candi-glow="">
        <circle cx="800" cy="470" r="170" fill="url(#candi-glow)" />
      </g>
      <g stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round">
        <rect x="705" y="520" width="190" height="42" rx="6" fill="#A79CC4" />
        <rect x="725" y="484" width="150" height="38" rx="6" fill="#B3A8CF" />
        <rect x="745" y="455" width="110" height="31" rx="6" fill="#BEB4D8" />
        <path d="M748 455 C748 392 852 392 852 455 Z" fill="#C9C0E0" />
        <rect x="788" y="380" width="24" height="22" rx="3" fill="#B3A8CF" />
        <path d="M789 382 L800 328 L811 382 Z" fill="#BEB4D8" />
        <circle cx="800" cy="326" r="6" fill="#FFC93C" />
        {/* Glowing doorway */}
        <path d="M784 562 L784 538 Q800 520 816 538 L816 562 Z" fill="#FFC93C" />
      </g>
      {/* Shading on the right side of each tier */}
      <g fill="#3B2F63" opacity="0.18">
        <rect x="830" y="522" width="63" height="38" rx="4" />
        <rect x="830" y="486" width="43" height="34" rx="4" />
        <rect x="830" y="457" width="23" height="27" rx="4" />
        <path d="M830 455 C830 425 852 420 852 455 Z" />
      </g>
      <MiniStupa x={722} y={520} />
      <MiniStupa x={878} y={520} />
      <MiniStupa x={742} y={484} />
      <MiniStupa x={858} y={484} />
    </Layer>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round">
      <rect x="-7" y="-10" width="14" height="46" rx="4" fill="#7A4E2D" />
      <circle cx="-26" cy="-30" r="30" fill="#3E9B4F" />
      <circle cx="24" cy="-34" r="32" fill="#3E9B4F" />
      <circle cx="0" cy="-62" r="36" fill="#47A859" />
      <path d="M-14 -78 C-4 -88 12 -88 20 -80" fill="none" stroke="#7FCB72" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

export function NearHillLayer() {
  return (
    <Layer>
      <g stroke={OUTLINE} strokeWidth="3">
        <path d="M0 760 C180 700 360 720 520 780 C600 805 645 845 700 900 L0 900 Z" fill="#2F7A43" />
        <path d="M1600 740 C1420 690 1240 720 1080 790 C1000 822 958 860 920 900 L1600 900 Z" fill="#2F7A43" />
      </g>
      <Tree x={170} y={735} s={1.15} />
      <Tree x={340} y={748} s={0.85} />
      <Tree x={1340} y={720} s={1.2} />
      <Tree x={1475} y={735} s={0.9} />
    </Layer>
  );
}

function Leaf({ x, y, r, s = 1 }: { x: number; y: number; r: number; s?: number }) {
  return (
    <path
      d="M0 0 C50 -42 140 -42 190 0 C140 42 50 42 0 0 Z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill="#0F2A1C"
    />
  );
}

export function FoliageLayer() {
  return (
    <Layer>
      {/* Bottom corners */}
      <Leaf x={-40} y={900} r={-55} s={1.6} />
      <Leaf x={-20} y={880} r={-25} s={1.3} />
      <Leaf x={40} y={905} r={-80} s={1.1} />
      <Leaf x={1640} y={900} r={-125} s={1.6} />
      <Leaf x={1620} y={880} r={-155} s={1.3} />
      <Leaf x={1560} y={905} r={-100} s={1.1} />
      {/* Top corners, hanging leaves that frame the title */}
      <Leaf x={-30} y={-10} r={35} s={1.4} />
      <Leaf x={-40} y={60} r={15} s={1.1} />
      <Leaf x={1630} y={-10} r={145} s={1.4} />
      <Leaf x={1640} y={60} r={165} s={1.1} />
    </Layer>
  );
}
