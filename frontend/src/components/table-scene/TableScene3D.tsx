"use client";

// The game table as a scene in the Arena Jitu world: each player's picks are coin spirits floating
// over that player's podium. During Live a spirit rises when its call is right and sinks when it
// is wrong, with a ridge of the coin's price line behind it. Loaded on demand by <TableScene>.

import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COIN } from "@/lib/coins";
import { Arena, PODIUM_SEATS, PODIUM_TOP_Y } from "@/components/world/Arena";
import { Backdrop } from "@/components/world/Backdrop";
import { Coin } from "@/components/world/Coin";
import { Effects } from "@/components/world/Effects";
import { useGlowMaterial } from "@/components/world/glow";
import { MonadCrystal } from "@/components/world/MonadCrystal";
import { Sky } from "@/components/world/Sky";
import { C, Toon, useToonGradient } from "@/components/world/toon";
import { renderSkillEffect3D, useSpriteTexture } from "@/components/skills/SkillEffect3D";
import { formatBps, formatScore, isVoid, lift, seatPlayers, signedBps, tableFxUrl } from "./model";
import { Ridge } from "./Ridge";
import { Trail, type TrailKind } from "./Trail";
import type { ScenePick, ScenePlayer, TableSceneProps } from "./types";

type SceneProps = Omit<TableSceneProps, "view" | "className">;

const ARENA_Y = -0.6;
const CRYSTAL_SCALE = 0.55;
/** Spirit rest height above the podium top, and how far a full lift moves it either way. */
const REST_Y = 0.9;
const LIFT_RANGE = 0.6;
const COIN_SIZE = 0.6;
const RIDGE_HEIGHT = 0.7;
/** Row width a podium's spirits may use; spacing shrinks as picks are added. */
const ROW_WIDTH = 2.4;
const POP_SECONDS = 0.45;
const CHIP = "pointer-events-none select-none whitespace-nowrap rounded-full border-2 border-garis font-extrabold";

// Screen labels live in one DOM layer over the canvas (not a React root per label, as drei's
// <Html> would make). Scene objects register an anchor by key, the layer registers the element,
// and <ProjectLabels> moves each element onto its anchor every frame.
class Labels {
  private anchors = new Map<string, THREE.Object3D>();
  private nodes = new Map<string, HTMLElement>();
  private at = new THREE.Vector3();
  private scale = new THREE.Vector3();

  anchor = (key: string) => (o: THREE.Object3D | null) => {
    if (o) this.anchors.set(key, o);
    else this.anchors.delete(key);
  };

  node = (key: string) => (el: HTMLElement | null) => {
    if (el) this.nodes.set(key, el);
    else this.nodes.delete(key);
  };

  project(camera: THREE.Camera, width: number, height: number) {
    for (const [key, el] of this.nodes) {
      const o = this.anchors.get(key);
      let shown = false;
      if (o) {
        o.getWorldPosition(this.at).project(camera);
        // Spirits pop in by scale, so their chips wait until the coin has mostly grown.
        shown = this.at.z < 1 && o.getWorldScale(this.scale).x > 0.6;
        // Kept inside the canvas, so labels of the outer seats never clip on narrow screens.
        const half = el.offsetWidth / 2 + 4;
        const x = THREE.MathUtils.clamp(((this.at.x + 1) / 2) * width, half, Math.max(half, width - half));
        const y = ((1 - this.at.y) / 2) * height;
        if (shown) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      el.style.visibility = shown ? "visible" : "hidden";
    }
  }
}

function ProjectLabels({ labels }: { labels: Labels }) {
  useFrame(({ camera, size }) => labels.project(camera, size.width, size.height));
  return null;
}

function backOut(t: number) {
  const s = 1.9;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

function SpiritChip({ pick, showReturn }: { pick: ScenePick; showReturn: boolean }) {
  const dead = isVoid(pick);
  return (
    <div className={`${CHIP} bg-dasar/90 px-1.5 py-px text-[10px] text-white ${dead ? "opacity-60" : ""}`}>
      <span className={pick.side === "Buy" ? "text-naik" : "text-turun"}>{pick.side}</span>
      {showReturn && <span> {dead ? "void" : formatBps(signedBps(pick))}</span>}
    </div>
  );
}

function Spirit({ pick, player, index, count, delay, phase, series, gradient, labels, renderEffect }: {
  pick: ScenePick;
  player: ScenePlayer;
  index: number;
  count: number;
  delay: number;
  series: readonly number[] | undefined;
  gradient: THREE.Texture;
  labels: Labels;
} & Pick<SceneProps, "phase" | "renderEffect">) {
  const coin = COIN[pick.symbol];
  const dead = isVoid(pick);
  // A frozen or locked pick's return is held, so its spirit holds still too.
  const still = dead || pick.effect === "FREEZE" || pick.effect === "LOCK";
  const spacing = Math.min(0.78, ROW_WIDTH / count);
  const x = (index - (count - 1) / 2) * spacing;
  const moving = phase === "live" || phase === "result";
  const target = moving ? REST_Y + lift(pick) * LIFT_RANGE : REST_Y;
  const trail: TrailKind | null = !moving ? null : dead ? "void" : lift(pick) >= 0 ? "up" : "down";

  const halo = useGlowMaterial("radial", coin.rim, 1.5, 2.4);
  const spirit = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const [coinGroup, setCoinGroup] = useState<THREE.Group | null>(null);
  const ridge = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const y = useRef(REST_Y);
  const glow = useRef(halo);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (born.current === null) born.current = t;
    const appear = THREE.MathUtils.clamp((t - born.current - delay) / POP_SECONDS, 0, 1);
    y.current = THREE.MathUtils.damp(y.current, target, 2.2, delta);
    if (spirit.current) {
      const bob = still ? 0 : Math.sin(t * 1.6 + index * 1.3) * 0.04;
      spirit.current.position.y = y.current + bob;
      spirit.current.scale.setScalar(Math.max(0.0001, backOut(appear)));
    }
    if (body.current) body.current.rotation.y = still ? 0 : Math.sin(t * 0.9 + index) * 0.45;
    if (ridge.current) ridge.current.scale.y = Math.max(0.0001, appear);
    glow.current.uniforms.uStrength.value = dead ? 0 : 1.1 + 0.4 * Math.sin(t * 2 + index);
  });

  return (
    <group position={[x, 0, 0]}>
      <group ref={ridge} position={[0, 0.02, -0.38]}>
        <Ridge series={series} width={spacing * 0.94} height={RIDGE_HEIGHT} tint={coin.rim} dim={dead} gradient={gradient} />
      </group>
      <group ref={spirit} position={[0, REST_Y, 0]} scale={0.0001}>
        {trail && <Trail kind={trail} strength={dead ? 1 : Math.min(1, Math.abs(lift(pick)) * 1.6)} size={COIN_SIZE} />}
        <mesh material={halo} position={[0, 0, -0.08]} renderOrder={2}>
          <planeGeometry args={[COIN_SIZE * 2.4, COIN_SIZE * 2.4]} />
        </mesh>
        <group ref={body} scale={COIN_SIZE}>
          <group ref={setCoinGroup}>
            <Coin coin={coin} gradient={gradient} dim={dead} />
          </group>
          {/* Skill effect slot: unit-coin space, centered on the coin. */}
          {pick.effect && (renderEffect ?? renderSkillEffect3D)({ pick, player, index, coin: coinGroup, gradient })}
        </group>
        <group ref={labels.anchor(`pick:${player.id}:${index}`)} position={[0, COIN_SIZE * 0.85, 0]} />
      </group>
    </group>
  );
}

// Commit phase: a sealed rune stone stands in for the hidden picks.
function SealedPicks({ gradient, color }: { gradient: THREE.Texture; color: string }) {
  const stone = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!stone.current) return;
    stone.current.rotation.y = clock.elapsedTime * 0.8;
    stone.current.position.y = REST_Y - 0.2 + Math.sin(clock.elapsedTime * 1.4) * 0.06;
  });
  return (
    <mesh ref={stone} scale={[0.26, 0.4, 0.26]}>
      <octahedronGeometry args={[1, 0]} />
      <Toon color={C.stoneDark} gradient={gradient} emissive={color} emissiveIntensity={0.18} />
    </mesh>
  );
}

// Reveal on: a forfeit podium shows a broken wax seal where its spirits would be.
function ForfeitSeal() {
  const map = useSpriteTexture(tableFxUrl("forfeit-seal"));
  if (!map) return null;
  return (
    <sprite scale={[1.1, 1.1, 1]} position={[0, REST_Y - 0.1, 0]} renderOrder={3}>
      <spriteMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

// Round winner: a gold and emerald burst behind the podium's spirits, turning slowly.
function WinBurst() {
  const map = useSpriteTexture(tableFxUrl("win-burst"));
  const reduce = useReducedMotion() ?? false;
  const mat = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current && !reduce) mat.current.rotation = clock.elapsedTime * 0.25;
  });
  if (!map) return null;
  return (
    <sprite scale={[2.8, 2.8, 1]} position={[0, REST_Y, -0.6]} renderOrder={1}>
      <spriteMaterial ref={mat} map={map} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function WinnerBeam({ color }: { color: string }) {
  const beam = useGlowMaterial("beam", color, 1.6);
  const floor = useGlowMaterial("radial", color, 2.2, 2);
  const mats = useRef({ beam });
  useFrame(({ clock }) => {
    mats.current.beam.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <>
      <mesh material={beam} position={[0, 1.6, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.9, 0.7, 3.2, 32, 1, true]} />
      </mesh>
      <mesh material={floor} position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[3.4, 3.4]} />
      </mesh>
    </>
  );
}

function SeatLabel({ player, phase, winner }: { player: ScenePlayer; phase: SceneProps["phase"]; winner: boolean }) {
  const sub =
    phase === "commit"
      ? "Picks sealed"
      : player.forfeit
        ? "Forfeit"
        : phase === "result" && player.score !== undefined
          ? `${formatScore(player.score)} pts`
          : null;
  return (
    <div
      className={`${CHIP} flex items-center gap-1.5 px-2.5 py-1 text-xs ${winner ? "bg-emas text-garis" : "bg-malam/90 text-white"}`}
    >
      <span className="h-2.5 w-2.5 rounded-full border border-garis" style={{ background: player.color }} />
      <span className="font-display text-sm font-normal">{player.name}</span>
      {sub && <span className={winner ? "text-garis/80" : "text-white/70"}>{sub}</span>}
      {winner && <span className="font-display text-sm font-normal">· Winner</span>}
    </div>
  );
}

function Seat({ seat, player, phase, prices, winner, gradient, labels, renderEffect }: {
  seat: number;
  player: ScenePlayer;
  winner: boolean;
  gradient: THREE.Texture;
  labels: Labels;
} & Pick<SceneProps, "phase" | "prices" | "renderEffect">) {
  const { x, z } = PODIUM_SEATS[seat];
  const forfeit = player.forfeit && phase !== "commit";
  const picks = phase === "commit" || forfeit ? [] : player.picks;
  return (
    <group position={[x, PODIUM_TOP_Y, z]}>
      {winner && <WinnerBeam color={player.color} />}
      {winner && <WinBurst />}
      {forfeit && <ForfeitSeal />}
      {phase === "commit" && <SealedPicks gradient={gradient} color={player.color} />}
      {picks.map((pick, i) => (
        <Spirit
          // Keyed by slot, not coin, so a SWAP plays its trade instead of popping a new spirit in.
          key={i}
          pick={pick}
          player={player}
          index={i}
          count={picks.length}
          delay={seat * 0.22 + i * 0.12}
          phase={phase}
          series={prices[pick.symbol]}
          gradient={gradient}
          labels={labels}
          renderEffect={renderEffect}
        />
      ))}
      {/* On the podium's outer side, clear of the spirits above and the seats behind. */}
      <group ref={labels.anchor(`seat:${player.id}`)} position={[Math.sign(x) * 1.25, -0.35, 0.35]} />
    </group>
  );
}

// Fixed view from the front, high enough (about 40 deg) that a front spirit at full lift stays clear of
// the podium behind it, and low enough that rising and sinking still reads. For each canvas size the
// camera steps in as close as it can while every podium, its spirit row and its seat label still
// project inside the frame, and the target slides so the slack splits evenly top and bottom.
// Portrait widens the lens.
const VIEW_DIR = new THREE.Vector3(0, 9.6, 11.2).normalize();
/** NDC the fit keeps clear of the canvas edge (labels and the idle sway need the room). */
const FIT_MARGIN_X = 0.9;
const FIT_MARGIN_Y = 0.88;

/** World points that must stay in frame: podium bases, the top of each row at full lift, seat labels. */
const FIT_POINTS = PODIUM_SEATS.flatMap(({ x, z }) => {
  const top = ARENA_Y + PODIUM_TOP_Y;
  const base = ARENA_Y + PODIUM_TOP_Y - 0.8;
  const high = top + REST_Y + LIFT_RANGE + COIN_SIZE;
  const out = Math.sign(x);
  return [
    new THREE.Vector3(x - 0.8, base, z + 0.8),
    new THREE.Vector3(x + 0.8, base, z + 0.8),
    new THREE.Vector3(x - ROW_WIDTH / 2, high, z),
    new THREE.Vector3(x + ROW_WIDTH / 2, high, z),
    new THREE.Vector3(x + out * 2.1, top - 0.35, z + 0.35),
  ];
});

function placeCamera(cam: THREE.PerspectiveCamera, dist: number, targetY: number) {
  cam.position.copy(VIEW_DIR).multiplyScalar(dist);
  cam.position.y += targetY;
  cam.lookAt(0, targetY, 0);
  cam.updateMatrixWorld();
}

/** NDC y extent of the fit points, or null when any point leaves the frame. */
function ndcBounds(cam: THREE.PerspectiveCamera, at: THREE.Vector3) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of FIT_POINTS) {
    at.copy(p).project(cam);
    if (Math.abs(at.x) > FIT_MARGIN_X || Math.abs(at.y) > FIT_MARGIN_Y) return null;
    lo = Math.min(lo, at.y);
    hi = Math.max(hi, at.y);
  }
  return { lo, hi };
}

/** Nearest distance (and centered target height) that fits FIT_POINTS for this lens and aspect. */
function fitFrame(fov: number, aspect: number) {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 140);
  const at = new THREE.Vector3();
  let targetY = 1;
  let dist = 40;
  for (let pass = 0; pass < 3; pass++) {
    let near = 4;
    let far = 60;
    for (let i = 0; i < 24; i++) {
      const mid = (near + far) / 2;
      placeCamera(cam, mid, targetY);
      if (ndcBounds(cam, at)) far = mid;
      else near = mid;
    }
    dist = far;
    placeCamera(cam, dist, targetY);
    const b = ndcBounds(cam, at);
    if (!b) break;
    // Shift the target by the NDC imbalance, scaled to world height at the target's distance.
    targetY += ((b.hi + b.lo) / 2) * dist * Math.tan(THREE.MathUtils.degToRad(fov / 2));
  }
  return { dist, targetY };
}

function CameraRig() {
  const fit = useRef({ key: "", dist: 0, targetY: 0 });
  useFrame(({ camera, size, clock }) => {
    const aspect = size.width / size.height;
    const portrait = Math.max(0, 1 - aspect);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = 34 + portrait * 18;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const key = `${size.width}x${size.height}`;
    if (fit.current.key !== key) fit.current = { key, ...fitFrame(fov, aspect) };
    const { dist, targetY } = fit.current;
    placeCamera(cam, dist, targetY);
    camera.position.x += Math.sin(clock.elapsedTime * 0.15) * 0.2;
    camera.lookAt(0, targetY, 0);
  });
  return null;
}

function isWinner(player: ScenePlayer, { phase, winnerIds }: Pick<SceneProps, "phase" | "winnerIds">) {
  return phase === "result" && (winnerIds?.includes(player.id) ?? false);
}

function LabelLayer({ labels, players, phase, winnerIds }: { labels: Labels } & SceneProps) {
  const at = "invisible absolute left-0 top-0";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {seatPlayers(players).map(
        (player) =>
          player && (
            <Fragment key={player.id}>
              <div ref={labels.node(`seat:${player.id}`)} className={at}>
                <SeatLabel player={player} phase={phase} winner={isWinner(player, { phase, winnerIds })} />
              </div>
              {phase !== "commit" &&
                !player.forfeit &&
                player.picks.map((pick, i) => (
                  // Phones skip the per-spirit chips: they crowd, and the spirit's height still shows the call.
                  <div key={`${pick.symbol}-${i}`} ref={labels.node(`pick:${player.id}:${i}`)} className={`${at} max-[480px]:hidden`}>
                    <SpiritChip pick={pick} showReturn={phase !== "reveal"} />
                  </div>
                ))}
            </Fragment>
          ),
      )}
    </div>
  );
}

function Scene({ players, prices, phase, winnerIds, labels, renderEffect }: SceneProps & { labels: Labels }) {
  const gradient = useToonGradient();
  const seats = seatPlayers(players);
  return (
    <>
      <color attach="background" args={[C.skyTop]} />
      <fog attach="fog" args={[C.fog, 18, 80]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#A6C4E6", "#12324A", 0.55]} />
      <directionalLight position={[-7, 11, 7]} intensity={2.1} color="#EAF0FF" />
      <directionalLight position={[6, 4, -10]} intensity={1.1} color="#7FB0FF" />

      <Sky still={false} />
      <Backdrop gradient={gradient} still={false} />
      <group position={[0, ARENA_Y, 0]}>
        <Arena gradient={gradient} still={false} />
        {/* A smaller crystal than the title screen, so it never hides the back podiums. Its floor
            glow stays on the rune circle (floor at y 0.28). */}
        <group scale={CRYSTAL_SCALE} position={[0, 0.28 * (1 - CRYSTAL_SCALE), 0]}>
          <MonadCrystal still={false} />
        </group>
        {seats.map(
          (player, i) =>
            player && (
              <Seat
                key={player.id}
                seat={i}
                player={player}
                phase={phase}
                prices={prices}
                winner={isWinner(player, { phase, winnerIds })}
                gradient={gradient}
                labels={labels}
                renderEffect={renderEffect}
              />
            ),
        )}
        <Sparkles count={40} scale={[11, 5, 11]} position={[0, 2.6, 0]} size={3} speed={0.3} color={C.kristalGlow} />
      </group>
      <CameraRig />
      <ProjectLabels labels={labels} />
      <Effects />
    </>
  );
}

export default function TableScene3D(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [labels] = useState(() => new Labels());

  // Stop rendering while the table is scrolled out of view.
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
        frameloop={visible ? "always" : "never"}
        camera={{ fov: 34, position: [0, 9.6, 11.2], near: 0.1, far: 140 }}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      >
        <Scene {...props} labels={labels} />
      </Canvas>
      <LabelLayer {...props} labels={labels} />
    </div>
  );
}
