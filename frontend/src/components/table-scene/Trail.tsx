"use client";

// A spirit's trail during Live: a rising spirit trails a Buy-colored wisp below it with motes
// streaming up, a sinking one a Sell-colored wisp above it with motes falling, and a void pick
// sits in a still grey mist. Draws the table-fx art when it has shipped, else the shared
// spirit-wisp tinted per direction, else plain glows. Lives in the spirit group (world units).

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { skillFxUrl, SKILL_FX_READY } from "@/components/skills/fx";
import { useSpriteTexture } from "@/components/skills/SkillEffect3D";
import { useGlowMaterial } from "@/components/world/glow";
import { tableFxUrl } from "./model";

export type TrailKind = "up" | "down" | "void";

type TableFxName = "buy-wisp" | "sell-wisp" | "void-mist";

/** Art in public/assets/table-fx/ that has shipped. Add a name when its file lands. */
const TABLE_FX_READY: ReadonlySet<TableFxName> = new Set<TableFxName>(["buy-wisp", "sell-wisp", "void-mist"]);

const ART: Record<TrailKind, TableFxName> = { up: "buy-wisp", down: "sell-wisp", void: "void-mist" };
const TINT: Record<TrailKind, string> = { up: "#7BE35A", down: "#FF6B5E", void: "#9AA7B4" };
const MOTES = 4;

const artUrl = (name: TableFxName) => (TABLE_FX_READY.has(name) ? tableFxUrl(name) : null);

export function Trail({ kind, strength, size }: {
  kind: TrailKind;
  /** 0..1, how far the spirit has moved; the trail fades in with it. */
  strength: number;
  /** The coin's diameter. */
  size: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const art = useSpriteTexture(artUrl(ART[kind]));
  const wisp = useSpriteTexture(SKILL_FX_READY.has("spirit-wisp") ? skillFxUrl("spirit-wisp") : null);
  const mist = useGlowMaterial("radial", TINT.void, 0.9, 1.6);
  const tail = useGlowMaterial("radial", TINT[kind], 1.4, 2.4);
  // The shared wisp is ivory and emerald, so the tint is pushed past 1 to stay bright when added.
  const tint = useMemo(() => new THREE.Color(TINT[kind]).multiplyScalar(1.6), [kind]);
  const motes = useRef<THREE.Group>(null);
  const dir = kind === "up" ? 1 : -1;

  useFrame(({ clock }) => {
    motes.current?.children.forEach((m, i) => {
      const p = (clock.elapsedTime * 0.6 + i / MOTES) % 1;
      // Motes start at the far end of the tail and stream past the coin in its direction.
      m.position.set(Math.sin(i * 2.4) * size * 0.35, dir * (p - 0.8) * size * 1.6, 0.05);
      m.scale.setScalar(size * 0.28 * Math.sin(Math.PI * p) * strength + 0.0001);
    });
  });

  if (kind === "void") {
    return art ? (
      <sprite scale={[size * 2.2, size * 2.2, 1]} position={[0, 0, -0.1]} renderOrder={1}>
        <spriteMaterial map={art} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    ) : (
      <mesh material={mist} position={[0, 0, -0.12]} renderOrder={1}>
        <planeGeometry args={[size * 2.2, size * 1.6]} />
      </mesh>
    );
  }

  const map = art ?? wisp;
  const h = size * 2.2;
  // The table-fx wisps are painted 1:2 portraits with their own colors and ink, so they keep
  // normal blending and their aspect; the shared wisp is square and glows when added.
  return (
    <group>
      {map ? (
        // The wisp's bulb sits at the coin and its tail trails behind the move; a down wisp is the up one turned over.
        <sprite scale={[art ? h * 0.5 : h, h, 1]} position={[0, -dir * h * 0.38, -0.1]} renderOrder={1}>
          <spriteMaterial
            map={map}
            color={art ? "#FFFFFF" : tint}
            rotation={art || dir > 0 ? 0 : Math.PI}
            opacity={strength}
            transparent
            depthWrite={false}
            blending={art ? THREE.NormalBlending : THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ) : (
        <mesh material={tail} position={[0, -dir * h * 0.38, -0.1]} renderOrder={1} scale={[1, strength + 0.0001, 1]}>
          <planeGeometry args={[size * 0.9, h]} />
        </mesh>
      )}
      {!reduce && (
        <group ref={motes}>
          {Array.from({ length: MOTES }, (_, i) =>
            wisp ? (
              <sprite key={i} scale={0.0001} renderOrder={1}>
                <spriteMaterial map={wisp} color={tint} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </sprite>
            ) : (
              <mesh key={i} scale={0.0001}>
                <octahedronGeometry args={[0.25, 0]} />
                <meshBasicMaterial color={TINT[kind]} toneMapped={false} />
              </mesh>
            ),
          )}
        </group>
      )}
    </group>
  );
}
