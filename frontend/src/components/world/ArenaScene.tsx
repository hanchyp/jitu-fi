"use client";

// Arena Jitu: low-poly toon 3D title scene. Everything is modelled from primitives in code,
// no external model files. Coin logos come from @web3icons/core (MIT) via lib/coins.
// See frontend/DESIGN.md for the art direction.

import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ARENA_COINS, coinDataUrl, type Coin as CoinDef } from "@/lib/coins";
import { Arena } from "./Arena";
import { Backdrop } from "./Backdrop";
import { Effects } from "./Effects";
import { MonadCrystal } from "./MonadCrystal";
import { Sky } from "./Sky";
import { C, Toon, useToonGradient } from "./toon";

const COINS = ARENA_COINS;

const INTRO_SECONDS = 2.6;
const ARENA_Y = -0.6;

// Paints the token logo onto a round coin face. The SVG loads asynchronously, then the texture refreshes.
function useCoinTexture(coin: CoinDef) {
  const invalidate = useThree((s) => s.invalidate);
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

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

function Coin({ coin, gradient }: { coin: CoinDef; gradient: THREE.Texture }) {
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

function CoinOrbit({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const ring = useRef<THREE.Group>(null);
  const coins = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.y = t * 0.2;
    coins.current.forEach((c, i) => {
      if (!c) return;
      c.rotation.y = t * 1.4 + i;
      c.position.y = Math.sin(t * 1.5 + i * 1.7) * 0.18;
    });
  });

  return (
    <group ref={ring} position={[0, 3.55, 0]}>
      {COINS.map((coin, i) => {
        const a = (i / COINS.length) * Math.PI * 2;
        return (
          <group key={coin.symbol} position={[Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6]}>
            <group ref={(el) => { coins.current[i] = el; }}>
              <Coin coin={coin} gradient={gradient} />
            </group>
          </group>
        );
      })}
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

function Scene({ still }: { still: boolean }) {
  const gradient = useToonGradient();
  return (
    <>
      <color attach="background" args={[C.skyTop]} />
      <fog attach="fog" args={[C.fog, 18, 80]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#9AAEFF", "#1B2A57", 0.55]} />
      {/* Moonlight key from the upper left, cool rim from behind. */}
      <directionalLight position={[-7, 11, 7]} intensity={2.1} color="#EAF0FF" />
      <directionalLight position={[6, 4, -10]} intensity={1.1} color="#7F8CFF" />

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
      <Effects />
    </>
  );
}

export default function ArenaScene({ still }: { still: boolean }) {
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
        <Scene still={still} />
      </Canvas>
    </div>
  );
}
