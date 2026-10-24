"use client";

// Arena Jitu: low-poly toon 3D title scene. Everything is modelled from primitives in code,
// no external model files. Coin logos come from @web3icons/core (MIT) via lib/coins.
// See frontend/DESIGN.md for the art direction.

import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ARENA_COINS } from "@/lib/coins";
import { Arena } from "./Arena";
import { Backdrop } from "./Backdrop";
import { Coin } from "./Coin";
import { CrestIntro, type CrestIntroProps } from "./Crest";
import { Effects } from "./Effects";
import { MonadCrystal } from "./MonadCrystal";
import { Sky } from "./Sky";
import { C, useToonGradient } from "./toon";

const COINS = ARENA_COINS;

const INTRO_SECONDS = 2.6;
const ARENA_Y = -0.6;

// Coin layout as [angle deg, height] around the crystal axis; 0 deg is screen right, 90 deg is
// straight behind; `coin` is the coin radius. The coins stay on the back and side arc, so they never pass in front of the
// crystal, the wordmark or the buttons. Wide screens spread them beside the crystal; portrait
// screens tuck them in and lift the back ones into the gap between the tagline and the crystal.
const COIN_SWAY = 0.14;
const COIN_SLOTS = {
  wide: { radius: 5.0, coin: 0.26, slots: [[-20, 2.5], [22, 3.6], [52, 3.1], [128, 3.1], [158, 3.6], [200, 2.5]] },
  tall: { radius: 2.9, coin: 0.3, slots: [[-40, 3.1], [15, 4.4], [60, 5.0], [120, 5.0], [165, 4.4], [220, 3.1]] },
} as const;

function placeCoin(i: number, aspect: number, sway: number, coin: THREE.Object3D) {
  const k = Math.min(1, Math.max(0, 1 - aspect) / 0.54);
  const { wide, tall } = COIN_SLOTS;
  const lerp = (a: number, b: number) => THREE.MathUtils.lerp(a, b, k);
  const radius = lerp(wide.radius, tall.radius);
  const a = THREE.MathUtils.degToRad(lerp(wide.slots[i][0], tall.slots[i][0])) + sway;
  coin.position.set(Math.cos(a) * radius, lerp(wide.slots[i][1], tall.slots[i][1]), -Math.sin(a) * radius);
  // Coin is unit size (radius 0.5); these radii are about half the old hero coins.
  coin.scale.setScalar(lerp(wide.coin, tall.coin) * 2);
}

function CoinOrbit({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const coins = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock, camera, size }) => {
    const t = still ? 0 : clock.elapsedTime;
    const sway = Math.sin(t * 0.25) * COIN_SWAY;
    coins.current.forEach((c, i) => {
      if (!c) return;
      placeCoin(i, size.width / size.height, sway, c);
      c.position.y += Math.sin(t * 1.5 + i * 1.7) * 0.12;
      // Face the camera with a lazy wobble, so the logo stays readable and the rim still shows.
      c.lookAt(camera.position);
      c.rotateY(Math.sin(t * 0.9 + i * 1.3) * 0.6);
    });
  });

  return (
    <group>
      {COINS.map((coin, i) => (
        <group key={coin.symbol} ref={(el) => { coins.current[i] = el; }}>
          <Coin coin={coin} gradient={gradient} />
        </group>
      ))}
    </group>
  );
}

// Framing: low and close so the arena fills the hero. Portrait screens widen the lens and step
// back so the crystal and at least three podiums stay in view.
function framing(aspect: number) {
  const portrait = Math.max(0, 1 - aspect);
  return {
    fov: 40 + portrait * 30,
    position: new THREE.Vector3(0, 3.9 + portrait * 1.6, 12.8 + portrait * 11),
    target: new THREE.Vector3(0, 2.45 - portrait * 1.2, 0),
  };
}

// Camera: fly-in on load, then ease toward the pointer.
function CameraRig({ still }: { still: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const start = useRef<number | null>(null);
  const from = useMemo(() => new THREE.Vector3(0, 16, 32), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame(({ clock, camera, size }, delta) => {
    const frame = framing(size.width / size.height);
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - frame.fov) > 0.01) {
      cam.fov = frame.fov;
      cam.updateProjectionMatrix();
    }

    let p = 1;
    if (!still) {
      if (start.current === null) start.current = clock.elapsedTime;
      const t = Math.min(1, (clock.elapsedTime - start.current) / INTRO_SECONDS);
      p = 1 - Math.pow(1 - t, 3);
      const k = Math.min(1, delta * 2.5);
      smooth.current.x += (pointer.current.x - smooth.current.x) * k;
      smooth.current.y += (pointer.current.y - smooth.current.y) * k;
    }

    camera.position.lerpVectors(from, frame.position, p);
    camera.position.x += smooth.current.x * 1.2;
    camera.position.y += -smooth.current.y * 0.5;
    target.copy(frame.target).setY(frame.target.y + (1 - p) * -1.5);
    camera.lookAt(target);
  });

  return null;
}

function Scene({ still, intro }: { still: boolean; intro: CrestIntroProps | null }) {
  const gradient = useToonGradient();
  return (
    <>
      <color attach="background" args={[C.skyTop]} />
      <fog attach="fog" args={[C.fog, 18, 80]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#A6C4E6", "#12324A", 0.55]} />
      {/* Moonlight key from the upper left, cool rim from behind. */}
      <directionalLight position={[-7, 11, 7]} intensity={2.1} color="#EAF0FF" />
      <directionalLight position={[6, 4, -10]} intensity={1.1} color="#7FB0FF" />

      <Sky still={still} />
      <Backdrop gradient={gradient} still={still} />
      <group position={[0, ARENA_Y, 0]}>
        <Arena gradient={gradient} still={still} />
        <MonadCrystal still={still} />
        <CoinOrbit gradient={gradient} still={still} />
        <Sparkles
          count={60}
          scale={[11, 5, 11]}
          position={[0, 2.6, 0]}
          size={3.2}
          speed={still ? 0 : 0.35}
          color={C.kristalGlow}
        />
      </group>
      <CameraRig still={still} />
      {intro && !still && <CrestIntro {...intro} />}
      <Effects />
    </>
  );
}

export default function ArenaScene({ still, intro = null }: { still: boolean; intro?: CrestIntroProps | null }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Stop rendering while the hero is scrolled out of view.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className="absolute inset-0">
      <Canvas
        flat
        dpr={[1, 2]}
        frameloop={still ? "demand" : visible ? "always" : "never"}
        camera={{ fov: 40, position: [0, 16, 32], near: 0.1, far: 140 }}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      >
        <Scene still={still} intro={intro} />
      </Canvas>
    </div>
  );
}
