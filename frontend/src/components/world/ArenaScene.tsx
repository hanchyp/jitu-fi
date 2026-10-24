"use client";

// Arena Jitu: low-poly toon 3D title scene. Everything is modelled from primitives in code,
// no external model files. Coin logos come from @web3icons/core (MIT).
// See frontend/DESIGN.md for the art direction.

import { Outlines, Sparkles, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import BNB from "@web3icons/core/svgs/tokens/background/BNB.svg.js";
import BTC from "@web3icons/core/svgs/tokens/background/BTC.svg.js";
import DOGE from "@web3icons/core/svgs/tokens/background/DOGE.svg.js";
import ETH from "@web3icons/core/svgs/tokens/background/ETH.svg.js";
import SOL from "@web3icons/core/svgs/tokens/background/SOL.svg.js";
import MON from "@web3icons/core/svgs/networks/background/monad.svg.js";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const C = {
  outline: "#0B1626",
  stone: "#7C86A8",
  stoneDark: "#4A5373",
  stoneTop: "#9AA3C2",
  kristal: "#836EF9",
  kristalGlow: "#C4B8FF",
  emas: "#FFC93C",
  fog: "#1B2552",
  mountain: "#24346B",
} as const;

const PLAYER_COLORS = ["#FFC93C", "#3DD68C", "#FF6B5E", "#5AA9FF"] as const;
// Official token logos (web3icons "background" variant) with each coin's brand color for the rim.
const COINS = [
  { symbol: "BTC", svg: BTC, rim: "#F7931A" },
  { symbol: "ETH", svg: ETH, rim: "#627EEA" },
  { symbol: "SOL", svg: SOL, rim: "#9945FF" },
  { symbol: "DOGE", svg: DOGE, rim: "#C2A633" },
  { symbol: "BNB", svg: BNB, rim: "#F3BA2F" },
  { symbol: "MON", svg: MON, rim: "#836EF9" },
] as const;

const INTRO_SECONDS = 2.4;
const LOOK_AT = new THREE.Vector3(0, 2.3, 0);

// Three-step gradient map gives the flat cel-shaded look.
function useToonGradient() {
  return useMemo(() => {
    const data = new Uint8Array([90, 170, 255]);
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

function Toon({ color, gradient, emissive, emissiveIntensity = 0 }: {
  color: string;
  gradient: THREE.Texture;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={gradient}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

function Arena({ gradient }: { gradient: THREE.Texture }) {
  // Deterministic pillar heights: a few are broken for character.
  const pillars = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const h = [1.7, 1.1, 1.7, 1.7, 0.8, 1.7, 1.3, 1.7][i];
        return { x: Math.cos(a) * 4.05, z: Math.sin(a) * 4.05, h, capped: h > 1.5 };
      }),
    [],
  );

  return (
    <group>
      {/* Floating island underside */}
      <mesh position={[0, -2.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[4.5, 3.4, 9]} />
        <Toon color={C.stoneDark} gradient={gradient} />
        <Outlines thickness={0.05} color={C.outline} />
      </mesh>
      {/* Main platform */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[4.4, 4.6, 0.7, 16]} />
        <Toon color={C.stone} gradient={gradient} />
        <Outlines thickness={0.05} color={C.outline} />
      </mesh>
      {/* Inner duel floor */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[3.35, 3.5, 0.18, 16]} />
        <Toon color={C.stoneTop} gradient={gradient} />
        <Outlines thickness={0.04} color={C.outline} />
      </mesh>

      {/* Glowing rune circles */}
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.95, 2.08, 64]} />
        <meshBasicMaterial color={C.kristal} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 1.21, 64]} />
        <meshBasicMaterial color={C.kristalGlow} toneMapped={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.55, 0.27, Math.sin(a) * 2.55]} rotation={[-Math.PI / 2, 0, -a]}>
            <planeGeometry args={[0.1, 0.32]} />
            <meshBasicMaterial color={C.kristal} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Pillars */}
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, 0.1, p.z]}>
          <mesh position={[0, p.h / 2, 0]}>
            <cylinderGeometry args={[0.22, 0.27, p.h, 6]} />
            <Toon color={C.stone} gradient={gradient} />
            <Outlines thickness={0.035} color={C.outline} />
          </mesh>
          {p.capped && (
            <mesh position={[0, p.h + 0.08, 0]}>
              <boxGeometry args={[0.62, 0.16, 0.62]} />
              <Toon color={C.stoneTop} gradient={gradient} />
              <Outlines thickness={0.035} color={C.outline} />
            </mesh>
          )}
        </group>
      ))}

      {/* Four player podiums */}
      {PLAYER_COLORS.map((color, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group key={color} position={[Math.cos(a) * 2.75, 0.26, Math.sin(a) * 2.75]}>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.42, 0.52, 0.44, 8]} />
              <Toon color={C.stoneDark} gradient={gradient} />
              <Outlines thickness={0.035} color={C.outline} />
            </mesh>
            <mesh position={[0, 0.47, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 0.08, 8]} />
              <Toon color={color} gradient={gradient} emissive={color} emissiveIntensity={0.35} />
              <Outlines thickness={0.03} color={C.outline} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Rounded square ("squircle") path centered on the origin. Holes need the opposite winding.
function roundedSquare(target: THREE.Path, size: number, r: number, clockwise: boolean) {
  const h = size / 2;
  target.moveTo(-h + r, -h);
  if (!clockwise) {
    target.lineTo(h - r, -h);
    target.quadraticCurveTo(h, -h, h, -h + r);
    target.lineTo(h, h - r);
    target.quadraticCurveTo(h, h, h - r, h);
    target.lineTo(-h + r, h);
    target.quadraticCurveTo(-h, h, -h, h - r);
    target.lineTo(-h, -h + r);
    target.quadraticCurveTo(-h, -h, -h + r, -h);
  } else {
    target.quadraticCurveTo(-h, -h, -h, -h + r);
    target.lineTo(-h, h - r);
    target.quadraticCurveTo(-h, h, -h + r, h);
    target.lineTo(h - r, h);
    target.quadraticCurveTo(h, h, h, h - r);
    target.lineTo(h, -h + r);
    target.quadraticCurveTo(h, -h, h - r, -h);
    target.lineTo(-h + r, -h);
  }
}

// The Monad mark: a thick squircle ring turned 45 degrees, extruded with a chunky bevel.
function useMonadMarkGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    roundedSquare(shape, 2.1, 0.85, false);
    const hole = new THREE.Path();
    roundedSquare(hole, 0.95, 0.34, true);
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.1,
      bevelSegments: 4,
      curveSegments: 18,
    });
    geometry.center();
    return geometry;
  }, []);
}

function MonadCrystal({ gradient, still }: { gradient: THREE.Texture; still: boolean }) {
  const geometry = useMonadMarkGeometry();
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const shards = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.45;
      group.current.position.y = 2.75 + Math.sin(t * 1.2) * 0.12;
    }
    if (halo.current) halo.current.scale.setScalar(1.18 + Math.sin(t * 2) * 0.05);
    if (shards.current) shards.current.rotation.y = -t * 0.6;
  });

  return (
    <group>
      <group ref={group} position={[0, 2.75, 0]}>
        <group rotation={[0, 0, Math.PI / 4]}>
          <mesh geometry={geometry}>
            <meshToonMaterial color={C.kristal} gradientMap={gradient} emissive="#4B36D6" emissiveIntensity={0.5} />
            <Outlines thickness={0.045} color={C.outline} />
          </mesh>
          {/* Soft glow shell */}
          <mesh ref={halo} geometry={geometry} scale={1.18}>
            <meshBasicMaterial
              color={C.kristalGlow}
              transparent
              opacity={0.08}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      </group>
      {/* Small squircle shards orbiting the mark */}
      <group ref={shards} position={[0, 2.75, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 1.85, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.85]}
              rotation={[0, -a, Math.PI / 4]}
              scale={0.13}
              geometry={geometry}
            >
              <meshToonMaterial color={C.kristalGlow} gradientMap={gradient} emissive={C.kristal} emissiveIntensity={0.6} />
            </mesh>
          );
        })}
      </group>
      <pointLight position={[0, 2.8, 0]} color={C.kristal} intensity={18} distance={9} decay={1.6} />
    </group>
  );
}

type CoinDef = (typeof COINS)[number];

// Paints the token logo onto a round coin face. The SVG loads asynchronously, then the texture refreshes.
function useCoinTexture(coin: CoinDef) {
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
    };

    paint();
    const img = new Image();
    img.onload = () => paint(img);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coin.svg)}`;
    return tex;
  }, [coin]);
}

function Coin({ coin, gradient }: { coin: CoinDef; gradient: THREE.Texture }) {
  const face = useCoinTexture(coin);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.13, 32]} />
        <Toon color={coin.rim} gradient={gradient} emissive={coin.rim} emissiveIntensity={0.2} />
        <Outlines thickness={0.03} color={C.outline} />
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
    if (ring.current) ring.current.rotation.y = t * 0.22;
    coins.current.forEach((c, i) => {
      if (!c) return;
      c.rotation.y = t * 1.4 + i;
      c.position.y = Math.sin(t * 1.5 + i * 1.7) * 0.18;
    });
  });

  return (
    <group ref={ring} position={[0, 3.3, 0]}>
      {COINS.map((coin, i) => {
        const a = (i / COINS.length) * Math.PI * 2;
        return (
          <group key={coin.symbol} position={[Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5]}>
            <group ref={(el) => { coins.current[i] = el; }}>
              <Coin coin={coin} gradient={gradient} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function Mountains({ gradient }: { gradient: THREE.Texture }) {
  const peaks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        const r = 22 + (i % 3) * 3;
        const h = 4 + ((i * 7) % 5) * 1.3;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, h, w: 3.5 + (i % 4) };
      }),
    [],
  );
  return (
    <group position={[0, -4.5, 0]}>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, p.z]}>
          <coneGeometry args={[p.w, p.h, 5]} />
          <Toon color={C.mountain} gradient={gradient} />
        </mesh>
      ))}
    </group>
  );
}

// Camera: fly-in on load, then ease toward the pointer. Pulls back on portrait screens.
function CameraRig({ still }: { still: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const start = useRef<number | null>(null);

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
    const aspect = size.width / size.height;
    const zoom = aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1;
    const end = new THREE.Vector3(0, 6.4 * zoom, 18 * zoom);

    let p = 1;
    if (!still) {
      if (start.current === null) start.current = clock.elapsedTime;
      const t = Math.min(1, (clock.elapsedTime - start.current) / INTRO_SECONDS);
      p = 1 - Math.pow(1 - t, 3);
      const k = Math.min(1, delta * 2.5);
      smooth.current.x += (pointer.current.x - smooth.current.x) * k;
      smooth.current.y += (pointer.current.y - smooth.current.y) * k;
    }

    const from = new THREE.Vector3(0, 15, 30);
    camera.position.lerpVectors(from, end, p);
    camera.position.x += smooth.current.x * 1.4;
    camera.position.y += -smooth.current.y * 0.6;
    camera.lookAt(LOOK_AT);
  });

  return null;
}

function Scene({ still }: { still: boolean }) {
  const gradient = useToonGradient();
  return (
    <>
      <fog attach="fog" args={[C.fog, 20, 46]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#8EA2FF", "#1B2A57", 0.45]} />
      <directionalLight position={[-6, 10, 6]} intensity={1.9} color="#FFE7C2" />

      <Stars radius={70} depth={25} count={1400} factor={3.2} fade speed={still ? 0 : 0.4} />
      <Mountains gradient={gradient} />
      <group position={[0, -0.6, 0]}>
        <Arena gradient={gradient} />
        <MonadCrystal gradient={gradient} still={still} />
        <CoinOrbit gradient={gradient} still={still} />
        <Sparkles
          count={45}
          scale={[9, 4, 9]}
          position={[0, 2.4, 0]}
          size={3}
          speed={still ? 0 : 0.35}
          color={C.kristalGlow}
        />
      </group>
      <CameraRig still={still} />
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
        dpr={[1, 1.75]}
        frameloop={still ? "demand" : visible ? "always" : "never"}
        camera={{ fov: 38, position: [0, 15, 30], near: 0.1, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene still={still} />
      </Canvas>
    </div>
  );
}
