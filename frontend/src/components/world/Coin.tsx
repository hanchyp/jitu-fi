"use client";

// A token coin: a toon rim with the official logo painted on both faces. Unit size (radius 0.5),
// so callers scale it. Reused by the title orbit and, later, the table's coin spirits.

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { coinDataUrl, type Coin as CoinDef } from "@/lib/coins";
import { Toon } from "./toon";

// Paints the token logo onto a round coin face. The SVG loads asynchronously, then the texture refreshes.
export function useCoinTexture(coin: CoinDef) {
  const invalidate = useThree((s) => s.invalidate);
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const paint = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = coin.rim;
      ctx.fillRect(0, 0, size, size);
      if (img) ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
      // Thin dark ring so the face reads as a separate disc on the rim.
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(11, 22, 38, 0.55)";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 5, 0, Math.PI * 2);
      ctx.stroke();
      tex.needsUpdate = true;
      // The reduced-motion still frame renders on demand, so ask for a frame once the logo lands.
      invalidate();
    };

    paint();
    const img = new Image();
    img.onload = () => paint(img);
    img.src = coinDataUrl(coin);
    return tex;
  }, [coin, invalidate]);
}

export function Coin({ coin, gradient }: { coin: CoinDef; gradient: THREE.Texture }) {
  const face = useCoinTexture(coin);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.13, 32]} />
        <Toon color={coin.rim} gradient={gradient} emissive={coin.rim} emissiveIntensity={0.25} />
      </mesh>
      {[0.066, -0.066].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, z < 0 ? Math.PI : 0, 0]}>
          <circleGeometry args={[0.47, 40]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
