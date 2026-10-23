"use client";

// The six skill spells on a 3D coin spirit, drawn through <TableScene>'s `renderEffect` slot.
// Each plays once when the effect lands, then holds a still mark that says the pick is changed:
// FREEZE encases it in ice, FLIP spins it upside down, SWAP trades it for a new spirit, INSURANCE
// puts a light shield under it, BOOST grows it in an aura, LOCK seals it with a gold padlock.
// Everything is in unit-coin space (radius 0.5). Under reduced motion the end state shows at once.

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Coin } from "@/components/world/Coin";
import { useGlowMaterial } from "@/components/world/glow";
import { C, Toon } from "@/components/world/toon";
import type { SpiritEffectContext } from "@/components/table-scene/types";
import { COIN } from "@/lib/coins";
import { SKILL_FX_READY, skillFxUrl, type SkillFxName } from "./fx";

const ICE = "#CDEFF4";
const ICE_RIM = "#EAFBFF";
const LOCKED_AGE = 1e3;

// ---------- timing helpers ----------

function clamp01(t: number) {
  return Math.min(1, Math.max(0, t));
}

function backOut(t: number) {
  const s = 1.9;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Seconds since this effect first rendered, and the clock for idle loops. Reduced motion jumps
 * straight to the end state and stops the loops.
 */
function useSpellClock() {
  const reduce = useReducedMotion() ?? false;
  const born = useRef<number | null>(null);
  return (t: number) => {
    if (born.current === null) born.current = t;
    return reduce ? { age: LOCKED_AGE, idle: 0 } : { age: t - born.current, idle: t };
  };
}

/**
 * The spirit's coin group as a ref the frame loop may move, put back as the scene left it when
 * the spell ends or changes.
 */
function useCoin(coin: THREE.Group | null) {
  const handle = useRef<THREE.Group | null>(null);
  useEffect(() => {
    handle.current = coin;
    return () => {
      resetTransform(handle.current);
      handle.current = null;
    };
  }, [coin]);
  return handle;
}

function resetTransform(node: THREE.Object3D | null) {
  node?.position.set(0, 0, 0);
  node?.rotation.set(0, 0, 0);
  node?.scale.setScalar(1);
}

// ---------- sprite hook ----------

const textures = new Map<SkillFxName, Promise<THREE.Texture | null>>();

function loadFx(name: SkillFxName) {
  if (!SKILL_FX_READY.has(name)) return null;
  let tex = textures.get(name);
  if (!tex) {
    tex = new THREE.TextureLoader().loadAsync(skillFxUrl(name)).then(
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      },
      () => null,
    );
    textures.set(name, tex);
  }
  return tex;
}

/** The sprite texture once it has loaded; null while loading, when missing, or when it failed. */
function useFxTexture(name: SkillFxName) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    loadFx(name)?.then((t) => live && setTex(t));
    return () => {
      live = false;
    };
  }, [name]);
  return tex;
}

/**
 * Draws the skill-fx sprite as a camera-facing billboard when it exists, else the procedural
 * children. `offset` moves only the sprite, for art drawn off-center (the insurance arc).
 */
function FxSprite({ name, size, offset, children }: {
  name: SkillFxName;
  size: number;
  offset?: [number, number, number];
  children: ReactNode;
}) {
  const tex = useFxTexture(name);
  if (!tex) return <>{children}</>;
  return (
    <sprite scale={[size, size, 1]} position={offset} renderOrder={3}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

// ---------- shared bits ----------

function Glow({ color, size, strength = 1.4, z = -0.12 }: { color: string; size: number; strength?: number; z?: number }) {
  const mat = useGlowMaterial("radial", color, strength, 2.2);
  return (
    <mesh material={mat} position={[0, 0, z]} renderOrder={2}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/** Small sparks drifting up around the coin, as wisp sprites once those ship. */
function Sparks({ color, count, radius }: { color: string; count: number; radius: number }) {
  const clock = useSpellClock();
  const wisp = useFxTexture("spirit-wisp");
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock: c }) => {
    const { idle } = clock(c.elapsedTime);
    const size = wisp ? 0.4 : 0.06;
    group.current?.children.forEach((s, i) => {
      const a = (i / count) * Math.PI * 2;
      const phase = (idle * 0.45 + i / count) % 1;
      s.position.set(Math.cos(a) * radius, -0.4 + phase * 1.1, Math.sin(a) * radius * 0.4 + 0.1);
      s.scale.setScalar(size * Math.sin(Math.PI * phase) + 0.0001);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) =>
        wisp ? (
          <sprite key={i}>
            <spriteMaterial map={wisp} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        ) : (
          <mesh key={i}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ),
      )}
    </group>
  );
}

// ---------- FREEZE: ice encase ----------

function Freeze({ gradient }: { gradient: THREE.Texture }) {
  const clock = useSpellClock();
  const ice = useMemo(() => new THREE.IcosahedronGeometry(0.78, 0), []);
  const block = useRef<THREE.Group>(null);
  const shards = useRef<THREE.Group>(null);
  useFrame(({ clock: c }) => {
    const { age } = clock(c.elapsedTime);
    // Shards fly in from all sides (0 to 0.35 s), then the block snaps shut around the coin.
    const fly = clamp01(age / 0.35);
    shards.current?.children.forEach((s, i) => {
      const a = (i / 6) * Math.PI * 2;
      const r = 1.3 * (1 - easeOut(fly)) + 0.35;
      s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.2);
      s.rotation.z = a + age * 4;
      s.scale.setScalar(fly < 1 ? 0.12 : 0.0001);
    });
    block.current?.scale.setScalar(Math.max(0.0001, backOut(clamp01((age - 0.3) / 0.45))));
  });
  return (
    <>
      <group ref={shards}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} scale={0.0001}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={ICE_RIM} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={block} scale={0.0001}>
        <FxSprite name="freeze-ice" size={2.4}>
          <Glow color={ICE} size={2} strength={0.9} />
          {/* Detail 0 keeps face normals, so the toon shading breaks into flat ice facets. */}
          <mesh geometry={ice} scale={[1, 1.12, 0.62]} renderOrder={3}>
            <meshToonMaterial color={ICE} gradientMap={gradient} emissive="#9FE3F0" emissiveIntensity={0.35} transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <lineSegments scale={[1, 1.12, 0.62]} renderOrder={4}>
            <edgesGeometry args={[ice]} />
            <lineBasicMaterial color={ICE_RIM} transparent opacity={0.85} />
          </lineSegments>
        </FxSprite>
      </group>
    </>
  );
}

// ---------- FLIP: spin upside down ----------

function Flip({ target }: { target: THREE.Group | null }) {
  const clock = useSpellClock();
  const swirl = useRef<THREE.Group>(null);
  const coinRef = useCoin(target);
  useFrame(({ clock: c }) => {
    const { age, idle } = clock(c.elapsedTime);
    const t = clamp01(age / 0.9);
    // One and a half turns end over end, landing upside down.
    if (coinRef.current) coinRef.current.rotation.z = easeOut(t) * Math.PI * 3;
    if (swirl.current) {
      swirl.current.rotation.z = -idle * 0.8 - easeOut(t) * Math.PI * 2;
      swirl.current.scale.setScalar(Math.max(0.0001, 1.25 - 0.35 * easeOut(clamp01((age - 0.6) / 0.4))));
    }
  });
  return (
    <group ref={swirl}>
      <FxSprite name="flip-swirl" size={2.3}>
        {[0, Math.PI].map((r, i) => (
          <group key={r} rotation={[0, 0, r]}>
            <mesh renderOrder={3}>
              <torusGeometry args={[0.72, 0.045, 6, 32, Math.PI * 0.7]} />
              <meshBasicMaterial color={i ? C.gading : C.zamrud} toneMapped={false} />
            </mesh>
            {/* Arrowhead at the arc's end. */}
            <mesh position={[0.72 * Math.cos(Math.PI * 0.7), 0.72 * Math.sin(Math.PI * 0.7), 0]} rotation={[0, 0, Math.PI * 0.7 + Math.PI]}>
              <coneGeometry args={[0.1, 0.2, 3]} />
              <meshBasicMaterial color={i ? C.gading : C.zamrud} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </FxSprite>
    </group>
  );
}

// ---------- SWAP: the two spirits trade places ----------

const SWAP_OUT = new THREE.Vector3(-1.1, 0.55, -0.4);
const SWAP_IN = new THREE.Vector3(1.1, 0.55, -0.4);
const ORIGIN = new THREE.Vector3();

function Swap({ ctx }: { ctx: SpiritEffectContext }) {
  const { pick, gradient } = ctx;
  const clock = useSpellClock();
  const old = useRef<THREE.Group>(null);
  const portal = useRef<THREE.Group>(null);
  const coinRef = useCoin(ctx.coin);
  useFrame(({ clock: c }) => {
    const { age, idle } = clock(c.elapsedTime);
    const t = easeOut(clamp01(age / 0.85));
    const arc = Math.sin(Math.PI * t) * 0.35;
    // The new spirit arrives from one side while the old one leaves by the other, crossing mid-air.
    coinRef.current?.position.lerpVectors(SWAP_IN, ORIGIN, t).setY(SWAP_IN.y * (1 - t) + arc);
    coinRef.current?.scale.setScalar(Math.max(0.0001, 0.4 + 0.6 * t));
    if (old.current) {
      old.current.position.lerpVectors(ORIGIN, SWAP_OUT, t).setY(SWAP_OUT.y * t - arc);
      old.current.scale.setScalar(Math.max(0.0001, 1 - t));
    }
    if (portal.current) {
      // Opens wide during the trade, then rests as a small ring behind the new spirit.
      const open = age < 0.85 ? Math.sin(Math.PI * clamp01(age / 0.85)) : 0;
      portal.current.scale.setScalar(0.9 + open * 0.5);
      portal.current.rotation.z = idle * 0.6;
    }
  });
  return (
    <>
      {pick.swappedFrom && (
        <group ref={old}>
          <Coin coin={COIN[pick.swappedFrom]} gradient={gradient} dim />
        </group>
      )}
      <group ref={portal} position={[0, 0, -0.25]}>
        <FxSprite name="swap-portal" size={1.6}>
          <Glow color={C.zamrud} size={1.9} strength={0.9} z={-0.02} />
          <mesh renderOrder={3}>
            <torusGeometry args={[0.66, 0.05, 6, 40]} />
            <meshBasicMaterial color={C.zamrud} toneMapped={false} />
          </mesh>
          <mesh renderOrder={3}>
            <torusGeometry args={[0.5, 0.025, 6, 40, Math.PI * 1.3]} />
            <meshBasicMaterial color={C.kristalGlow} toneMapped={false} />
          </mesh>
        </FxSprite>
      </group>
    </>
  );
}

// ---------- INSURANCE: light shield under the spirit ----------

function Insurance({ gradient }: { gradient: THREE.Texture }) {
  const clock = useSpellClock();
  const shield = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock: c }) => {
    const { age } = clock(c.elapsedTime);
    const open = Math.max(0.0001, backOut(clamp01(age / 0.5)));
    shield.current?.scale.set(open, 1, open);
    if (pulse.current) {
      const p = clamp01((age - 0.2) / 0.6);
      pulse.current.scale.setScalar(0.5 + p * 1.1);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = p < 1 ? 0.8 * (1 - p) : 0;
    }
  });
  return (
    // Tipped toward the camera, so the shield reads as a basin catching the coin.
    <group position={[0, -0.72, 0.05]} rotation={[0.45, 0, 0]}>
      <group ref={shield} scale={[0.0001, 1, 0.0001]}>
        <FxSprite name="insurance-shield" size={2} offset={[0, 0.55, 0]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Glow color={C.gading} size={1.9} strength={1.1} z={0.06} />
          </group>
          <mesh>
            <cylinderGeometry args={[0.66, 0.5, 0.1, 32]} />
            <Toon color={C.gading} gradient={gradient} emissive={C.gading} emissiveIntensity={0.55} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.66, 0.06, 8, 40]} />
            <Toon color={C.emas} gradient={gradient} emissive={C.emas} emissiveIntensity={0.25} />
          </mesh>
        </FxSprite>
      </group>
      <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <ringGeometry args={[0.62, 0.7, 40]} />
        <meshBasicMaterial color={C.gading} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------- BOOST: the spirit grows in an aura ----------

const BOOST_SCALE = 1.4;

function Boost({ target }: { target: THREE.Group | null }) {
  const clock = useSpellClock();
  const aura = useRef<THREE.Group>(null);
  const coinRef = useCoin(target);
  useFrame(({ clock: c }) => {
    const { age, idle } = clock(c.elapsedTime);
    const grow = backOut(clamp01(age / 0.55));
    coinRef.current?.scale.setScalar(1 + (BOOST_SCALE - 1) * grow);
    aura.current?.scale.setScalar(Math.max(0.0001, grow * (1 + Math.sin(idle * 2.4) * 0.05)));
  });
  return (
    <>
      <group ref={aura}>
        <FxSprite name="boost-aura" size={3.2}>
          <Glow color={C.zamrud} size={2.8} strength={1.6} />
          <mesh position={[0, 0, -0.1]} renderOrder={3}>
            <ringGeometry args={[0.8, 0.86, 40]} />
            <meshBasicMaterial color={C.zamrud} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
          </mesh>
        </FxSprite>
      </group>
      <Sparks color={C.zamrud} count={5} radius={0.85} />
    </>
  );
}

// ---------- LOCK: gold padlock seal ----------

function Lock({ gradient }: { gradient: THREE.Texture }) {
  const clock = useSpellClock();
  const lock = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  useFrame(({ clock: c }) => {
    const { age } = clock(c.elapsedTime);
    // Drops in from above, lands with a bounce, and a gold ring flashes on the seal.
    const fall = clamp01(age / 0.45);
    if (lock.current) {
      lock.current.position.y = -0.18 + (1 - backOut(fall)) * 0.9;
      lock.current.scale.setScalar(Math.max(0.0001, Math.min(1, fall * 2)));
    }
    if (flash.current) {
      const f = clamp01((age - 0.45) / 0.5);
      flash.current.scale.setScalar(0.3 + f * 1.2);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = f > 0 && f < 1 ? 0.9 * (1 - f) : 0;
    }
  });
  return (
    <group position={[0.24, 0, 0.16]}>
      <group ref={lock} scale={0.0001}>
        <FxSprite name="lock-seal" size={0.85}>
          {/* Shackle loops over the coin's edge; body sits in front. */}
          <mesh position={[0, 0.16, 0]}>
            <torusGeometry args={[0.14, 0.045, 8, 20, Math.PI]} />
            <Toon color={C.emasTua} gradient={gradient} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.42, 0.34, 0.16]} />
            <Toon color={C.emas} gradient={gradient} emissive={C.emas} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, -0.02, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 12]} />
            <meshBasicMaterial color={C.outline} />
          </mesh>
          <mesh position={[0.2, -0.16, 0.09]} scale={0.07}>
            <octahedronGeometry args={[1, 0]} />
            <Toon color={C.zamrud} gradient={gradient} emissive={C.zamrud} emissiveIntensity={0.5} />
          </mesh>
        </FxSprite>
      </group>
      <mesh ref={flash} position={[0, -0.18, 0.1]} renderOrder={3}>
        <ringGeometry args={[0.3, 0.36, 32]} />
        <meshBasicMaterial color={C.emas} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** One spirit's spell. Keyed by the skill, so a new effect replays from the start. */
export function SpiritSkillEffect(ctx: SpiritEffectContext) {
  switch (ctx.pick.effect) {
    case "FREEZE":
      return <Freeze gradient={ctx.gradient} />;
    case "FLIP":
      return <Flip target={ctx.coin} />;
    case "SWAP":
      return <Swap ctx={ctx} />;
    case "INSURANCE":
      return <Insurance gradient={ctx.gradient} />;
    case "BOOST":
      return <Boost target={ctx.coin} />;
    case "LOCK":
      return <Lock gradient={ctx.gradient} />;
    default:
      return null;
  }
}

/** Ready-made `renderEffect` for <TableScene>; it is also the scene's default. */
export function renderSkillEffect3D(ctx: SpiritEffectContext) {
  return <SpiritSkillEffect key={ctx.pick.effect} {...ctx} />;
}
