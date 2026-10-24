"use client";

// Anchor for one player's avatar, mounted on top of each podium (origin = podium top center).
// Wave 2 replaces the beacon below with a camera-facing sprite avatar (drei <Billboard> with a
// texture), standing on y = 0 and about AVATAR_HEIGHT tall. Until then the seat shows as "open".

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGlowMaterial } from "./glow";
import { hdr } from "./toon";

export const AVATAR_HEIGHT = 1.5;

export function PodiumAvatar({ seat, color, still }: { seat: number; color: string; still: boolean }) {
  const marker = useRef<THREE.Mesh>(null);
  const beacon = useGlowMaterial("beam", color, 1.3);
  const markerColor = useMemo(() => hdr(color, 2.2), [color]);
  const mat = useRef(beacon);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime + seat * 1.3;
    mat.current.uniforms.uTime.value = t;
    if (marker.current) {
      marker.current.rotation.y = t * 1.2;
      marker.current.position.y = AVATAR_HEIGHT * 0.85 + Math.sin(t * 2) * 0.08;
    }
  });

  return (
    <group name={`podium-avatar-${seat}`}>
      <mesh material={beacon} position={[0, AVATAR_HEIGHT / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.3, 0.34, AVATAR_HEIGHT, 20, 1, true]} />
      </mesh>
      <mesh ref={marker} position={[0, AVATAR_HEIGHT * 0.85, 0]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial color={markerColor} toneMapped={false} />
      </mesh>
    </group>
  );
}
