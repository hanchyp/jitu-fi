"use client";

// The floating stone duel platform: craggy underside, rim stones, glowing runes, pillars with
// crystal flames and four podiums. Each podium carries a player avatar (see PodiumAvatar).

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PodiumAvatar } from "./PodiumAvatar";
import { C, PLAYER_COLORS, Toon, craggy, hdr } from "./toon";

const RUNE_Y = 0.27;
const PODIUM_RADIUS = 2.85;

/** Seat positions (arena space) for the four podiums, front seats first. */
export const PODIUM_SEATS = PLAYER_COLORS.map((color, i) => {
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  return { color, x: Math.cos(a) * PODIUM_RADIUS, z: Math.sin(a) * PODIUM_RADIUS };
});

function useArenaGeometries() {
  return useMemo(() => {
    const under = craggy(new THREE.ConeGeometry(4.5, 4.2, 10, 4), [0.35, 0.18, 0.35], 3);
    under.rotateX(Math.PI);
    const rubble = craggy(new THREE.DodecahedronGeometry(0.5, 0), [0.12, 0.12, 0.12], 5);
    const rimStone = craggy(new THREE.BoxGeometry(0.9, 0.42, 0.6, 1, 1, 1), [0.06, 0.05, 0.06], 21);
    return { under, rubble, rimStone };
  }, []);
}

function RimStones({ geometry, gradient }: { geometry: THREE.BufferGeometry; gradient: THREE.Texture }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 22;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      d.position.set(Math.cos(a) * 4.45, 0.12 + (i % 3) * 0.04, Math.sin(a) * 4.45);
      d.rotation.set(0, -a + Math.PI / 2, (i % 2) * 0.06);
      d.scale.setScalar(i % 4 === 0 ? 1.15 : 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]}>
      <Toon color={C.stoneTop} gradient={gradient} />
    </instancedMesh>
  );
}

function Runes({ still }: { still: boolean }) {
  const outer = useRef<THREE.Group>(null);
  const colors = useMemo(
    () => ({ main: hdr(C.kristal, 2.6), light: hdr(C.kristalGlow, 2.2), dim: hdr(C.kristal, 1.6) }),
    [],
  );
  useFrame(({ clock }) => {
    if (!still && outer.current) outer.current.rotation.z = clock.elapsedTime * 0.06;
  });
  return (
    <group position={[0, RUNE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[1.95, 2.1, 64]} />
        <meshBasicMaterial color={colors.main} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[1.15, 1.22, 64]} />
        <meshBasicMaterial color={colors.light} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[3.05, 3.1, 64]} />
        <meshBasicMaterial color={colors.dim} toneMapped={false} />
      </mesh>
      <group ref={outer}>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const tall = i % 2 === 0;
          return (
            <mesh key={i} position={[Math.cos(a) * 2.55, Math.sin(a) * 2.55, 0]} rotation={[0, 0, a + Math.PI / 2]}>
              <planeGeometry args={tall ? [0.1, 0.36] : [0.22, 0.08]} />
              <meshBasicMaterial color={tall ? colors.main : colors.light} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Pillars({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  // Deterministic pillar heights: a few are broken for character.
  const pillars = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        // The two front pillars are broken stubs so they never hide the crystal or podiums.
        const h = [1.9, 0.5, 0.65, 1.9, 0.9, 1.9, 1.4, 1.9][i];
        return { x: Math.cos(a) * 4.0, z: Math.sin(a) * 4.0, h, capped: h > 1.5 };
      }),
    [],
  );
  const flame = useMemo(() => hdr(C.kristalGlow, 3), []);
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    flames.current.forEach((f, i) => {
      if (!f) return;
      f.rotation.y = t * 1.5 + i;
      f.position.y = 0.42 + Math.sin(t * 2.2 + i) * 0.06;
    });
  });

  return (
    <>
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, 0.1, p.z]}>
          <mesh position={[0, p.h / 2, 0]}>
            <cylinderGeometry args={[0.24, 0.3, p.h, 6]} />
            <Toon color={C.stone} gradient={gradient} />
          </mesh>
          {p.capped && (
            <group position={[0, p.h + 0.09, 0]}>
              <mesh>
                <boxGeometry args={[0.68, 0.18, 0.68]} />
                <Toon color={C.stoneTop} gradient={gradient} />
              </mesh>
              <mesh ref={(el) => { flames.current[i] = el; }} position={[0, 0.42, 0]} scale={[0.75, 1.5, 0.75]}>
                <octahedronGeometry args={[0.17, 0]} />
                <meshBasicMaterial color={flame} toneMapped={false} />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </>
  );
}

function Podiums({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const rings = useMemo(() => PLAYER_COLORS.map((c) => hdr(c, 1.8)), []);
  return (
    <>
      {PODIUM_SEATS.map(({ color, x, z }, i) => (
        <group key={color} position={[x, RUNE_Y - 0.01, z]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.66, 0.74, 0.24, 8]} />
            <Toon color={C.stone} gradient={gradient} />
          </mesh>
          <mesh position={[0, 0.44, 0]}>
            <cylinderGeometry args={[0.46, 0.56, 0.42, 8]} />
            <Toon color={C.stoneDark} gradient={gradient} />
          </mesh>
          <mesh position={[0, 0.69, 0]}>
            <cylinderGeometry args={[0.42, 0.44, 0.08, 8]} />
            <Toon color={color} gradient={gradient} emissive={color} emissiveIntensity={0.45} />
          </mesh>
          <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.68, 32]} />
            <meshBasicMaterial color={rings[i]} toneMapped={false} />
          </mesh>
          <group name={`podium-slot-${i}`} position={[0, 0.73, 0]}>
            <PodiumAvatar seat={i} still={still} />
          </group>
        </group>
      ))}
    </>
  );
}

const RUBBLE: { p: [number, number, number]; s: number }[] = [
  { p: [-3.4, -3.2, 1.6], s: 0.9 },
  { p: [2.9, -4.2, 2.2], s: 0.6 },
  { p: [0.6, -5.4, -2.4], s: 0.75 },
  { p: [-1.8, -6.1, 1.2], s: 0.45 },
  { p: [3.8, -2.6, -1.8], s: 0.5 },
];

function Rubble({ geometry, gradient, still }: { geometry: THREE.BufferGeometry; gradient: THREE.Texture; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!still && group.current) group.current.rotation.y = clock.elapsedTime * 0.05;
  });
  return (
    <group ref={group}>
      {RUBBLE.map((r, i) => (
        <mesh key={i} geometry={geometry} position={r.p} scale={r.s} rotation={[i, i * 2, 0]}>
          <Toon color={C.stoneDark} gradient={gradient} />
        </mesh>
      ))}
    </group>
  );
}

export function Arena({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const geo = useArenaGeometries();
  return (
    <group>
      {/* Floating island underside */}
      <mesh geometry={geo.under} position={[0, -2.6, 0]}>
        <Toon color={C.stoneDark} gradient={gradient} />
      </mesh>
      <Rubble geometry={geo.rubble} gradient={gradient} still={still} />
      {/* Main platform */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[4.4, 4.6, 0.7, 20]} />
        <Toon color={C.stone} gradient={gradient} />
      </mesh>
      <RimStones geometry={geo.rimStone} gradient={gradient} />
      {/* Inner duel floor */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[3.35, 3.5, 0.18, 20]} />
        <Toon color={C.stoneTop} gradient={gradient} />
      </mesh>
      <Runes still={still} />
      <Pillars gradient={gradient} still={still} />
      <Podiums gradient={gradient} still={still} />
    </group>
  );
}
