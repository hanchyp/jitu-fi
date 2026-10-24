"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Arena, PODIUM_SEATS } from "@/components/world/Arena";
import { Backdrop } from "@/components/world/Backdrop";
import { MonadCrystal } from "@/components/world/MonadCrystal";
import { C, useToonGradient } from "@/components/world/toon";
import type { Phase } from "@/mocks/table";

type Props = { phase: Phase; selected: number; locked: boolean; winners: string[] };
const SEAT_IDS = ["you", "bruno", "dex", "bera"];

function Camera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const portrait = size.width / size.height < 1.2;
    camera.position.set(0, portrait ? 10 : 8, portrait ? 22 : 18);
    camera.lookAt(0, 0.7, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function PodiumSignals({ phase, selected, locked, winners }: Props) {
  const signals = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    signals.current.forEach((mesh, i) => {
      if (!mesh) return;
      const active = phase === "results" || phase === "finished" ? winners.includes(SEAT_IDS[i]) : phase === "commit" ? i === 0 && (selected > 0 || locked) : true;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = active ? (locked || phase !== "commit" ? .26 : .1) + Math.sin(clock.elapsedTime * 2 + i) * .04 : 0;
      mesh.scale.y = active && (phase === "results" || phase === "finished") ? 1.3 : 1;
    });
  });
  return <group>{PODIUM_SEATS.map((seat, i) => <mesh key={seat.color} ref={(mesh) => { signals.current[i] = mesh; }} position={[seat.x, 1.65, seat.z]}>
    <cylinderGeometry args={[.34, .45, 1.8, 8, 1, true]} />
    <meshBasicMaterial color={seat.color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>)}</group>;
}

function PickSeals({ phase, selected, locked }: Props) {
  const seals = useRef<THREE.Group>(null);
  const seat = PODIUM_SEATS[0];
  useFrame(({ clock }, delta) => {
    if (!seals.current) return;
    const target = locked ? 1 : .8;
    const scale = THREE.MathUtils.damp(seals.current.scale.x, target, 8, delta);
    seals.current.scale.setScalar(scale);
    seals.current.position.y = locked ? 1.03 : 1.03 + Math.sin(clock.elapsedTime * 2) * .035;
  });
  if (phase !== "commit" && phase !== "reveal") return null;
  return <group ref={seals} position={[seat.x, 1.03, seat.z]}>
    {Array.from({ length: selected }, (_, index) => {
      const angle = index / Math.max(1, selected) * Math.PI * 2;
      return <group key={index} position={[Math.cos(angle) * .48, 0, Math.sin(angle) * .48]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.09, .13, 6]} />
          <meshBasicMaterial color={locked ? "#DAAE4B" : "#F2EDE1"} side={THREE.DoubleSide} />
        </mesh>
        {locked && <mesh position={[0, .09, 0]}><octahedronGeometry args={[.06]} /><meshBasicMaterial color="#DAAE4B" /></mesh>}
      </group>;
    })}
  </group>;
}

function World(props: Props) {
  const gradient = useToonGradient();
  return <>
    <color attach="background" args={[C.skyTop]} /><fog attach="fog" args={[C.fog, 22, 70]} />
    <ambientLight intensity={.7} /><hemisphereLight args={["#A6C4E6", "#12324A", .7]} />
    <directionalLight position={[-7, 11, 7]} intensity={2.1} color="#EAF0FF" />
    <directionalLight position={[6, 4, -10]} intensity={1.1} color="#7FB0FF" />
    <Backdrop gradient={gradient} still={false} />
    <Arena gradient={gradient} still={false} /><MonadCrystal still={false} />
    <PodiumSignals {...props} /><PickSeals {...props} /><Camera />
  </>;
}

export default function GameArenaScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} style={{ position: "absolute", inset: 0 }}>
    <Canvas flat dpr={[1, 1.5]} frameloop={visible ? "always" : "never"} camera={{ fov: 39, position: [0, 8, 18], near: .1, far: 100 }} gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}>
      <World {...props} />
    </Canvas>
  </div>;
}
