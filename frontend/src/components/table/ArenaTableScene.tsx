"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Html } from "@react-three/drei";
import Image from "next/image";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Arena, PODIUM_SEATS } from "@/components/world/Arena";
import { Backdrop } from "@/components/world/Backdrop";
import { MonadCrystal } from "@/components/world/MonadCrystal";
import { C, useToonGradient } from "@/components/world/toon";
import { COINS, PLAYERS } from "@/mocks/table";
import { coinDataUrl } from "@/lib/coins";
import { liveProgress, pickReturn, playerPicks } from "./demo-engine";
import type { ArenaTableProps, ArenaTableViewProps } from "./ArenaTable";
import { PlayerSeat } from "./PlayerPanels";
import { TableCoin } from "./TableCoin";

const SEATS = ["you", "bruno", "dex", "bera"];
// Rotate the landing arena so the challenger sits at the near edge of the table.
const TABLE_SEATS = PODIUM_SEATS.map((seat) => ({ ...seat, x: (seat.x - seat.z) / Math.SQRT2, z: (seat.x + seat.z) / Math.SQRT2 }));

function TableCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const narrow = size.width / size.height < 1.4;
    camera.position.set(0, narrow ? 12 : 10.5, narrow ? 9.5 : 8);
    camera.lookAt(0, .4, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function PickTokens({ state }: ArenaTableProps) {
  const picks = playerPicks(state);
  const progress = liveProgress(state);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, delta) => {
    groups.current.forEach((group, index) => {
      if (!group) return;
      const playerPicksAtSeat = picks[SEATS[index]];
      group.children.forEach((child, pickIndex) => {
        const pick = playerPicksAtSeat[pickIndex];
        if (!pick) return;
        const target = .35 + Math.max(-.2, Math.min(.65, pickReturn(pick, state.round, progress, state.scenario) / 100));
        child.position.y = THREE.MathUtils.damp(child.position.y, target, 6, delta);
      });
    });
  });
  return <>{TABLE_SEATS.map((seat, index) => {
    const hidden = state.phase === "commit";
    const seatPicks = hidden ? index === 0 ? state.picks : [] : picks[SEATS[index]];
    return <group key={index} position={[seat.x, .8, seat.z]} ref={(group) => { groups.current[index] = group; }}>
      {seatPicks.map((pick, pickIndex) => <group key={pick.symbol} position={[(pickIndex - (seatPicks.length - 1) / 2) * .3, .35, 0]} scale={pick.skill === "BOOST" ? 1.2 : 1}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.13, .13, .055, 16]} /><meshStandardMaterial color={hidden ? state.locked ? "#DAAE4B" : "#7C86A8" : "#DAAE4B"} metalness={.4} roughness={.5} /></mesh>
        {!hidden && <Html center position={[0, 0, .04]} zIndexRange={[3, 1]} style={{ pointerEvents: "none" }}><Image src={coinDataUrl(COINS.find((coin) => coin.symbol === pick.symbol)!)} width={19} height={19} alt="" className="jitu-table-podiumToken" unoptimized /></Html>}
        {pick.skill === "INSURANCE" && !hidden && <mesh><sphereGeometry args={[.2, 12, 8]} /><meshBasicMaterial color="#40D0A3" wireframe transparent opacity={.35} /></mesh>}
      </group>)}
    </group>;
  })}</>;
}

// Final winner only: a soft light column and halo lift off the podium and fade while a few gold
// coins spiral up. One shot (~2.4 s) then hidden; the canvas stays mounted. None under reduced motion.
const RISE_SECONDS = 2.4;
const RISE_COINS = Array.from({ length: 7 }, (_, i) => ({ angle: i * .9 + Math.sin(i * 4.1) * .3, radius: .45 + (i % 3) * .13, delay: .15 + i * .1 + (i % 2) * .04, size: .1 + (i % 3) * .03, height: 1.9 + (i % 4) * .35 }));
const easeOut = (t: number) => 1 - (1 - t) ** 3;

function WinRise({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const column = useRef<THREE.Mesh>(null);
  const coins = useRef<(THREE.Mesh | null)[]>([]);
  const born = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    born.current ??= t;
    const age = t - born.current;
    if (!group.current) return;
    group.current.visible = age < RISE_SECONDS + .2;
    if (!group.current.visible) return;
    const p = Math.min(1, age / RISE_SECONDS);
    if (ring.current) {
      ring.current.position.y = .1 + easeOut(p) * 2.4;
      ring.current.scale.setScalar(1 + easeOut(p) * .7);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = .6 * (1 - p) * Math.min(1, age * 5);
    }
    if (column.current) {
      column.current.scale.y = Math.max(.0001, easeOut(Math.min(1, age / .7)));
      (column.current.material as THREE.MeshBasicMaterial).opacity = .4 * Math.sin(Math.PI * p);
    }
    RISE_COINS.forEach((c, i) => {
      const coin = coins.current[i];
      if (!coin) return;
      const k = THREE.MathUtils.clamp((age - c.delay) / (RISE_SECONDS - .5), 0, 1);
      const r = c.radius * (1 - k * .35);
      const a = c.angle + easeOut(k) * 4.4;
      coin.position.set(Math.cos(a) * r, .2 + easeOut(k) * c.height, Math.sin(a) * r);
      coin.rotation.set(Math.PI / 2, k * 7 + i, 0);
      coin.scale.setScalar(c.size * Math.min(1, k * 8));
      (coin.material as THREE.MeshBasicMaterial).opacity = 1 - THREE.MathUtils.smoothstep(k, .6, 1);
    });
  });
  return <group ref={group}>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.55, .85, 32]} /><meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh ref={column} position={[0, 1.2, 0]}><cylinderGeometry args={[.4, .6, 2.4, 20, 1, true]} /><meshBasicMaterial color="#DAAE4B" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {RISE_COINS.map((_, i) => <mesh key={i} ref={(m) => { coins.current[i] = m; }} scale={.0001}><cylinderGeometry args={[1, 1, .22, 20]} /><meshBasicMaterial color="#DAAE4B" transparent /></mesh>)}
  </group>;
}

function TableWorld(props: ArenaTableViewProps) {
  const gradient = useToonGradient();
  const { size } = useThree();
  const calm = useReducedMotion();
  const stretch = Math.max(1.1, Math.min(1.8, size.width / size.height * .72));
  return <>
    <color attach="background" args={[C.skyTop]} /><fog attach="fog" args={[C.fog, 25, 65]} />
    <ambientLight intensity={.9} /><hemisphereLight args={["#A6C4E6", "#12324A", .8]} />
    <directionalLight position={[-7, 11, 7]} intensity={2.1} color="#EAF0FF" />
    <Backdrop gradient={gradient} still={false} /><TableCamera />
    <group scale={[stretch, 1, 1]}>
    <group rotation={[0, -Math.PI / 4, 0]}><Arena gradient={gradient} still={false} /></group>
    <group scale={[1 / stretch, 1, 1]}><group scale={.32} position={[0, .35, 0]}><MonadCrystal still={false} /></group></group>
    <PickTokens {...props} />
    {COINS.map((coin, index) => {
      const angle = (index / COINS.length) * Math.PI * 2;
      const selected = props.state.picks.some((pick) => pick.symbol === coin.symbol);
      const x = Math.sin(angle) * 2.05;
      const z = Math.cos(angle) * 1.9;
      return <group key={coin.symbol} position={[x, .4, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.36, .42, 24]} /><meshBasicMaterial color={selected ? "#DAAE4B" : "#4A5373"} /></mesh>
        <Html center position={[0, .35, 0]} zIndexRange={[6, 4]}><TableCoin state={props.state} onInspect={props.onInspect} symbol={coin.symbol} /></Html>
      </group>;
    })}
    {TABLE_SEATS.map((seat, index) => {
      const player = PLAYERS.find((item) => item.id === SEATS[index])!;
      const won = (props.state.phase === "results" || props.state.phase === "finished") && props.winners.includes(player.id);
      return <group key={player.id}>
        {won && props.state.phase === "finished" && !calm && <group position={[seat.x, .8, seat.z]}><WinRise color={player.color} /></group>}
        {won && <mesh position={[seat.x, 1.6, seat.z]}><cylinderGeometry args={[.42, .55, 2, 12, 1, true]} /><meshBasicMaterial color={player.color} transparent opacity={.24} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
        <Html center position={[seat.x * 1.45, .9, seat.z * 1.45]} zIndexRange={[9, 7]}><div className="jitu-table-worldSeat"><PlayerSeat state={props.state} player={player} index={index} /></div></Html>
      </group>;
    })}
    </group>
  </>;
}

export default function ArenaTableScene(props: ArenaTableViewProps) {
  return <div className="jitu-table-canvas">
    <Canvas flat dpr={[1, 1.5]} camera={{ fov: 40, position: [0, 12.8, 11.2], near: .1, far: 100 }} gl={{ antialias: true, powerPreference: "low-power" }}><TableWorld {...props} /></Canvas>
  </div>;
}
