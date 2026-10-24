"use client";

// The world around the arena, layered in depth: two rings of toon peaks, floating rock islands
// and a sea of low-poly clouds. Fog does the atmospheric perspective.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C, Toon, craggy, hdr, rng } from "./toon";

type Ring = { seed: number; count: number; radius: [number, number]; height: [number, number]; base: number; rock: string; snow: string };

const RINGS: Ring[] = [
  { seed: 11, count: 14, radius: [30, 36], height: [9, 15], base: -10, rock: "#2A5272", snow: "#B4CAD8" },
  { seed: 23, count: 18, radius: [52, 62], height: [16, 27], base: -12, rock: "#1F4560", snow: "#8FADC0" },
];

// One merged, vertex-colored geometry per ring: a dark base, a lit rock band and snow caps.
function usePeakRing({ seed, count, radius, height, base, rock, snow }: Ring) {
  return useMemo(() => {
    const rand = rng(seed);
    const dark = new THREE.Color(rock).multiplyScalar(0.55);
    const mid = new THREE.Color(rock);
    const cap = new THREE.Color(snow);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      // Leave a gap straight behind the camera; the peaks frame the arena instead.
      const a = Math.PI * 0.08 + (i / count) * Math.PI * 1.84 + (rand() - 0.5) * 0.15 + Math.PI / 2;
      const r = radius[0] + rand() * (radius[1] - radius[0]);
      const h = height[0] + rand() * (height[1] - height[0]);
      const w = h * (0.45 + rand() * 0.25);
      const g = craggy(new THREE.ConeGeometry(w, h, 6 + Math.floor(rand() * 3), 3), [w * 0.14, h * 0.05, w * 0.14], seed * 100 + i);
      g.rotateY(rand() * Math.PI);
      g.translate(Math.cos(a) * r, base + h / 2, Math.sin(a) * r);
      const pos = g.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const tmp = new THREE.Color();
      for (let f = 0; f < pos.count; f += 3) {
        const y = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
        const t = (y - base) / h;
        tmp.copy(t > 0.74 ? cap : t > 0.3 ? mid : dark);
        for (let k = 0; k < 3; k++) tmp.toArray(colors, (f + k) * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.deleteAttribute("uv");
      parts.push(g);
    }
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, [seed, count, radius, height, base, rock, snow]);
}

function PeakRing({ ring, gradient }: { ring: Ring; gradient: THREE.Texture }) {
  const geometry = usePeakRing(ring);
  return (
    <mesh geometry={geometry}>
      <Toon color="#FFFFFF" gradient={gradient} vertexColors />
    </mesh>
  );
}

type Island = { x: number; y: number; z: number; s: number; trees: number; shard: boolean };

const ISLANDS: Island[] = [
  { x: -10, y: 1.4, z: -4, s: 1, trees: 2, shard: true },
  { x: 11, y: 2.8, z: -7, s: 1.25, trees: 3, shard: false },
  { x: -16, y: 5, z: -15, s: 1.6, trees: 3, shard: false },
  { x: 17, y: -0.2, z: -13, s: 1.5, trees: 1, shard: true },
  { x: -7.5, y: -3.4, z: 3.5, s: 0.65, trees: 1, shard: false },
  { x: 8.5, y: -2.8, z: 4, s: 0.6, trees: 0, shard: true },
  { x: -26, y: 1.5, z: -28, s: 2.3, trees: 4, shard: false },
  { x: 27, y: 6, z: -26, s: 2.1, trees: 2, shard: false },
  { x: 5, y: 8.5, z: -30, s: 1.4, trees: 1, shard: false },
];

function useIslandGeometries() {
  return useMemo(() => {
    const under = craggy(new THREE.ConeGeometry(1.4, 2.6, 7, 3), [0.2, 0.12, 0.2], 7);
    under.rotateX(Math.PI);
    under.translate(0, -1.4, 0);
    const top = craggy(new THREE.CylinderGeometry(1.5, 1.4, 0.4, 7, 1), [0.12, 0.05, 0.12], 9);
    const tree = craggy(new THREE.ConeGeometry(0.32, 1.1, 5, 2), [0.05, 0.04, 0.05], 13);
    tree.translate(0, 0.75, 0);
    const shard = new THREE.OctahedronGeometry(0.28, 0);
    shard.scale(0.7, 1.8, 0.7);
    return { under, top, tree, shard };
  }, []);
}

function FloatingIslands({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const geo = useIslandGeometries();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const glow = useMemo(() => hdr(C.kristal, 3.2), []);
  const layout = useMemo(() => {
    const rand = rng(42);
    return ISLANDS.map((isl) => ({
      ...isl,
      spin: rand() * Math.PI * 2,
      phase: rand() * Math.PI * 2,
      trees: Array.from({ length: isl.trees }, () => {
        const a = rand() * Math.PI * 2;
        const r = 0.3 + rand() * 0.8;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.7 + rand() * 0.6 };
      }),
    }));
  }, []);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    groups.current.forEach((g, i) => {
      if (!g) return;
      const isl = layout[i];
      g.position.y = isl.y + Math.sin(t * 0.5 + isl.phase) * 0.25 * isl.s;
      g.rotation.y = isl.spin + Math.sin(t * 0.15 + isl.phase) * 0.15;
    });
  });

  return (
    <group>
      {layout.map((isl, i) => (
        <group
          key={i}
          ref={(el) => { groups.current[i] = el; }}
          position={[isl.x, isl.y, isl.z]}
          rotation={[0, isl.spin, 0]}
          scale={isl.s}
        >
          <mesh geometry={geo.under}>
            <Toon color={C.stoneDark} gradient={gradient} />
          </mesh>
          <mesh geometry={geo.top}>
            <Toon color="#6F86A0" gradient={gradient} />
          </mesh>
          {isl.trees.map((tr, k) => (
            <mesh key={k} geometry={geo.tree} position={[tr.x, 0.1, tr.z]} scale={tr.s}>
              <Toon color="#24506A" gradient={gradient} />
            </mesh>
          ))}
          {isl.shard && (
            <mesh geometry={geo.shard} position={[-0.5, 0.6, 0.4]} rotation={[0.2, 0, 0.25]}>
              <meshBasicMaterial color={glow} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// Each cloud is a cluster of flattened low-poly puffs; all puffs share one instanced draw call.
function useCloudPuffs() {
  return useMemo(() => {
    const rand = rng(77);
    const puffs: THREE.Matrix4[] = [];
    const addCloud = (x: number, y: number, z: number, size: number) => {
      const n = 4 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const s = size * (0.6 + rand() * 0.6) * (k === 0 ? 1.3 : 1);
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x + (k - n / 2) * size * 0.75 + rand() * size * 0.3, y + rand() * size * 0.3, z + (rand() - 0.5) * size),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rand() * Math.PI, 0)),
          new THREE.Vector3(s * 1.25, s * 0.62, s),
        );
        puffs.push(m);
      }
    };
    // Sea of clouds below the arena.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
      const r = 9 + rand() * 18;
      addCloud(Math.cos(a) * r, -6.5 - rand() * 2.5, Math.sin(a) * r, 2 + rand() * 1.6);
    }
    // A few higher clouds drifting between the islands, kept off the title area.
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      addCloud(side * (12 + rand() * 14), 0.5 + rand() * 4, -10 - rand() * 22, 1.4 + rand() * 1.2);
    }
    return puffs;
  }, []);
}

function Clouds({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const puffs = useCloudPuffs();
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    puffs.forEach((p, i) => m.setMatrixAt(i, p));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [puffs]);

  useFrame(({ clock }) => {
    if (still || !group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.008;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, undefined, puffs.length]}>
        <Toon color="#7D9BB8" gradient={gradient} emissive="#2B4E6E" emissiveIntensity={0.35} />
      </instancedMesh>
    </group>
  );
}

export function Backdrop({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  return (
    <group>
      {RINGS.map((ring) => (
        <PeakRing key={ring.seed} ring={ring} gradient={gradient} />
      ))}
      <FloatingIslands gradient={gradient} still={still} />
      <Clouds gradient={gradient} still={still} />
    </group>
  );
}
