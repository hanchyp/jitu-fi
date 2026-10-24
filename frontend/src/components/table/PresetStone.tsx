// Cut-stone silhouettes echo the floating arena without introducing another artwork style.
export function PresetStone({ tier }: { tier: number }) {
  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path d="m9 91 20-9 60 1 23 12-17 11-26 8-33-7Z" fill="#263349" stroke="#040b10" strokeWidth="3" />
    <path d="m9 91 27 8 33 5 43-9-17 11-26 8-33-7Z" fill="#152b3e" />
    {Array.from({ length: tier }, (_, index) => {
      const y = 78 - index * 18;
      const inset = index * 7;
      return <g key={index}>
        <path d={`M${26 + inset} ${y - 6}l12-8h${47 - inset * 2}l12 9-3 17-24 6-${42 - inset * 2}-7Z`} fill="#4a5373" stroke="#040b10" strokeWidth="3" strokeLinejoin="round" />
        <path d={`m${26 + inset} ${y - 6} 33 8 ${38 - inset * 2}-7-12-9H${38 + inset}Z`} fill="#7c86a8" />
        <path d={`m${37 + inset} ${y + 1} 11 3-4 6m21-5 15-2`} fill="none" stroke="#a7b4c8" strokeWidth="2" opacity=".45" />
      </g>;
    })}
    <path d={`M60 ${77 - (tier - 1) * 18}v-18l14 5-14 5`} fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="m18 106-9 5 14 3m77-7 9 5-7 4" fill="none" stroke="#4a5373" strokeWidth="3" />
  </svg>;
}
