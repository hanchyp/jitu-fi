"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Coin } from "@/components/world/Coin";
import { Toon, useToonGradient } from "@/components/world/toon";
import { COINS } from "@/mocks/table";

function useReverseTexture() {
  const invalidate = useThree((store) => store.invalidate);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#113048";
    context.fillRect(0, 0, 256, 256);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const crest = new Image();
    crest.onload = () => { context.drawImage(crest, 55, 35, 146, 175); map.needsUpdate = true; invalidate(); };
    crest.src = "/brand/jitu-crest.webp";
    return map;
  }, [invalidate]);
  return texture;
}

function CoinModel({ anchor, symbol, gradient, reverse }: { anchor: HTMLElement; symbol?: string; gradient: THREE.Texture; reverse: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  const asset = COINS.find((coin) => coin.symbol === symbol);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const translation = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  useFrame(() => {
    if (!group.current) return;
    const rect = anchor.getBoundingClientRect();
    group.current.visible = anchor.isConnected && rect.width > 0 && rect.height > 0 && getComputedStyle(anchor).visibility !== "hidden";
    if (!group.current.visible) return;
    group.current.position.set(rect.left + rect.width / 2 - size.width / 2, size.height / 2 - rect.top - rect.height / 2, 0);
    group.current.quaternion.identity();
    let modelScale = Math.max(rect.width, rect.height) * .96;
    const rotor = anchor.querySelector<HTMLElement>(".jitu-coin3dRotor");
    const flight = anchor.closest<HTMLElement>(".jitu-hand-flight");
    for (const element of [flight, rotor]) {
      if (!element) continue;
      const transform = getComputedStyle(element).transform;
      if (transform === "none") continue;
      matrix.fromArray(new DOMMatrix(transform).toFloat64Array());
      matrix.decompose(translation, rotation, scale);
      euler.setFromQuaternion(rotation);
      euler.set(-euler.x, -euler.y, euler.z);
      rotation.setFromEuler(euler);
      group.current.quaternion.multiply(rotation);
      if (element === rotor) {
        group.current.position.y -= translation.y;
        modelScale *= Math.max(scale.x, scale.y);
      }
    }
    group.current.scale.setScalar(modelScale);
  });
  return <group ref={group}>
    {asset ? <Coin coin={asset} gradient={gradient} /> : <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.5, .5, .13, 32]} /><Toon color="#DAAE4B" gradient={gradient} /></mesh>}
    {/* Overlay the reverse of the landing coin, retaining its actual cylinder geometry. */}
    <mesh position={[0, 0, -.07]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.47, 40]} /><meshBasicMaterial map={reverse} toneMapped={false} /></mesh>
  </group>;
}

function Models({ host, still }: { host: HTMLElement; still: boolean }) {
  const [anchors, setAnchors] = useState<{ element: HTMLElement; symbol?: string }[]>([]);
  const gradient = useToonGradient();
  const reverse = useReverseTexture();
  const { invalidate } = useThree();
  useEffect(() => {
    const sync = () => {
      const next = Array.from(host.querySelectorAll<HTMLElement>(".jitu-coin3d")).map((element) => ({ element, symbol: element.dataset.coinSymbol }));
      setAnchors((previous) => previous.length === next.length && previous.every((node, index) => node.element === next[index].element && node.symbol === next[index].symbol) ? previous : next);
      invalidate();
    };
    const firstFrame = requestAnimationFrame(sync);
    const observer = new MutationObserver(sync);
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-coin-symbol"] });
    return () => { cancelAnimationFrame(firstFrame); observer.disconnect(); };
  }, [host, invalidate]);
  useEffect(() => {
    if (anchors.length) { host.setAttribute("data-coin-renderer", "webgl"); invalidate(); }
    return () => { host.removeAttribute("data-coin-renderer"); };
  }, [anchors.length, host, invalidate]);
  useEffect(() => { if (still) invalidate(); }, [still, invalidate]);
  return <>
    <ambientLight intensity={1} /><hemisphereLight args={["#EAF0FF", "#12324A", .7]} />
    <directionalLight position={[-300, 500, 800]} intensity={2.1} color="#EAF0FF" />
    {anchors.map((anchor, index) => <CoinModel key={`${index}-${anchor.symbol ?? "crest"}`} anchor={anchor.element} symbol={anchor.symbol} gradient={gradient} reverse={reverse} />)}
  </>;
}

class ModelBoundary extends Component<{ host: HTMLElement; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.host.removeAttribute("data-coin-renderer"); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function CoinModelLayer({ host, still }: { host: HTMLElement; still: boolean }) {
  const [lost, setLost] = useState(false);
  useEffect(() => () => { host.removeAttribute("data-coin-renderer"); }, [host]);
  if (lost) return null;
  return <ModelBoundary host={host}><div className="jitu-coin-modelLayer" aria-hidden="true">
    {/* R3F gives its wrapper div inline pointer-events: auto, which would cover the coins. */}
    <Canvas style={{ pointerEvents: "none" }} orthographic camera={{ position: [0, 0, 1000], zoom: 1, near: .1, far: 2000 }} flat dpr={[1, 1.5]} frameloop={still ? "demand" : "always"} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", () => { host.removeAttribute("data-coin-renderer"); setLost(true); }, { once: true }); }}>
      <Models host={host} still={still} />
    </Canvas>
  </div></ModelBoundary>;
}
