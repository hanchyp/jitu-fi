"use client";

// One player's avatar, mounted on top of each podium (origin = podium top center): a full-body
// sprite on a plane that turns around Y to face the camera, so the feet stay planted.
// Seat 0 (front right, gold) is the challenger; the other seats hold the house champions.

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

export const AVATAR_HEIGHT = 1.5;

const SPRITES = [
  "/assets/landing/avatar-hero.webp",
  "/assets/landing/avatar-bruno-bull.webp",
  "/assets/landing/avatar-dex-degen.webp",
  "/assets/landing/avatar-bera-bear.webp",
] as const;

// The 512 × 768 sprites leave 8% empty above the head and 3% below the soles.
const PLANE_H = AVATAR_HEIGHT / 0.89;
const PLANE_W = (PLANE_H * 2) / 3;
const SOLE_MARGIN = 0.03 * PLANE_H;

// A slight cool tint settles the painted sprites into the moonlit scene.
const NIGHT_TINT = "#E4E8FF";

// Premultiplied upload keeps transparent texels from bleeding a halo into the mipmaps.
function prepareSprite(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
}

function Sprite({ seat, still }: { seat: number; still: boolean }) {
  const texture = useTexture(SPRITES[seat], prepareSprite);
  const turn = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const world = useRef(new THREE.Vector3());
  const invalidate = useThree((s) => s.invalidate);

  // The reduced-motion still frame renders on demand, so redraw once the sprite has loaded.
  useEffect(() => invalidate(), [invalidate, texture]);

  useFrame(({ camera, clock }) => {
    const g = turn.current;
    if (!g) return;
    g.getWorldPosition(world.current);
    g.rotation.y = Math.atan2(camera.position.x - world.current.x, camera.position.z - world.current.z);
    // Idle "breathing": a small squash and stretch anchored at the feet.
    if (!still && body.current) {
      const s = Math.sin(clock.elapsedTime * 2.1 + seat * 1.7) * 0.022;
      body.current.scale.set(1 - s * 0.5, 1 + s, 1);
    }
  });

  return (
    <group ref={turn}>
      <group ref={body}>
        <mesh position={[0, PLANE_H / 2 - SOLE_MARGIN, 0]}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
          {/* Alpha-tested so the cut-out writes depth (and gets the toon outline); the texture is
              premultiplied, so blend with ONE / ONE_MINUS_SRC_ALPHA for clean soft edges. */}
          <meshBasicMaterial
            map={texture}
            color={NIGHT_TINT}
            transparent
            alphaTest={0.5}
            blending={THREE.CustomBlending}
            blendSrc={THREE.OneFactor}
            blendDst={THREE.OneMinusSrcAlphaFactor}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function PodiumAvatar({ seat, still }: { seat: number; still: boolean }) {
  return (
    <group name={`podium-avatar-${seat}`}>
      {/* Sprites stream in with the 3D chunk; the arena renders without them until then. */}
      <Suspense fallback={null}>
        <Sprite seat={seat} still={still} />
      </Suspense>
    </group>
  );
}
