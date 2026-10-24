import Image from "next/image";

// Parallel coin faces and thin rim slices retain real depth during a CSS 3D turn.
// Concealed hands never receive a front asset, even on the hidden face.
export function CoinToken3D({ frontSrc, concealed = false, reveal = false }: { frontSrc?: string; concealed?: boolean; reveal?: boolean }) {
  return <span className="jitu-coin3d" data-concealed={concealed} data-reveal={reveal} aria-hidden="true">
    <span className="jitu-coin3dRotor">
      {[-2, -1, 0, 1, 2].map((depth) => <span key={depth} className="jitu-coin3dEdge" style={{ transform: `translateZ(${depth}px)` }} />)}
      {frontSrc && <span className="jitu-coin3dFace jitu-coin3dFront"><Image src={frontSrc} alt="" width={32} height={32} unoptimized /></span>}
      <span className="jitu-coin3dFace jitu-coin3dBack"><Image src="/brand/jitu-crest.webp" alt="" width={32} height={36} /></span>
    </span>
  </span>;
}
