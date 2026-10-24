"use client";

// The Principal Crystal: the Monad mark (a squircle ring turned 45 degrees), cut into facets,
// lit from inside, with a halo behind it, a beam onto the rune circle and orbiting light motes.

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGlowMaterial } from "./glow";
import { C, hdr } from "./toon";

export const CRYSTAL_Y = 2.75;
const FLOOR_Y = 0.28;

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

// Few curve segments and a two-step bevel read as cut facets instead of a smooth plastic ring.
function useMonadMarkGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    roundedSquare(shape, 2.1, 0.85, false);
    const hole = new THREE.Path();
    roundedSquare(hole, 0.95, 0.34, true);
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.13,
      bevelSegments: 2,
      curveSegments: 4,
    });
    geometry.center();
    return geometry;
  }, []);
}

const CRYSTAL_VERTEX = /* glsl */ `
uniform vec3 uLightDir;
varying vec3 vViewPos;
varying vec3 vObjPos;
varying vec3 vLight;
void main() {
  vObjPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vLight = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
  gl_Position = projectionMatrix * mv;
}
`;

// Flat facet normals from screen derivatives, three toon bands, a hot rim, an inner glow
// on the facets that face the viewer and the odd facet glinting. uPulse (0..1) breathes it.
const CRYSTAL_FRAGMENT = /* glsl */ `
uniform float uPulse;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;
uniform vec3 uRim;
varying vec3 vViewPos;
varying vec3 vObjPos;
varying vec3 vLight;
void main() {
  vec3 objN = normalize(cross(dFdx(vObjPos), dFdy(vObjPos)));
  float id = fract(sin(dot(floor(objN * 6.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float glint = smoothstep(0.92, 1.0, sin(uTime * 0.9 + id * 40.0)) * step(0.55, id);
  vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 v = normalize(-vViewPos);
  float ndl = dot(n, vLight);
  vec3 col = ndl > 0.72 ? uLight : ndl > 0.05 ? uMid : uDeep;
  float facing = max(dot(n, v), 0.0);
  // Light seems to come from inside: strongest around the hole, fading toward the outer edge.
  float core = 1.0 - smoothstep(0.45, 1.35, length(vObjPos.xy));
  col += uRim * core * core * facing * (0.18 + 0.32 * uPulse);
  col += uRim * pow(1.0 - facing, 3.0) * (1.3 + 1.5 * uPulse);
  col += uRim * glint * 1.4;
  gl_FragColor = vec4(col, 1.0);
}
`;

function useCrystalMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CRYSTAL_VERTEX,
        fragmentShader: CRYSTAL_FRAGMENT,
        uniforms: {
          uPulse: { value: 0.5 },
          uTime: { value: 0 },
          uLightDir: { value: new THREE.Vector3(-0.5, 0.8, 0.6).normalize() },
          uDeep: { value: new THREE.Color("#2A1C85") },
          uMid: { value: new THREE.Color("#5F49E0") },
          uLight: { value: new THREE.Color("#A08CFF") },
          uRim: { value: hdr(C.kristalGlow, 1.45) },
        },
      }),
    [],
  );
}

const MOTES = 22;

function moteMatrix(i: number, t: number, target: THREE.Matrix4, dummy: THREE.Object3D) {
  const orbit = i % 3;
  const k = Math.floor(i / 3);
  const radius = [1.55, 1.95, 2.35][orbit];
  const speed = [0.9, -0.65, 0.5][orbit];
  const tilt = [0.35, -0.5, 0.15][orbit];
  const a = (k / Math.ceil(MOTES / 3)) * Math.PI * 2 + t * speed + orbit;
  const x = Math.cos(a) * radius;
  const z = Math.sin(a) * radius;
  dummy.position.set(x, z * Math.sin(tilt) + Math.sin(t * 2 + i) * 0.08, z * Math.cos(tilt));
  dummy.scale.setScalar(0.7 + 0.5 * Math.sin(t * 3 + i * 1.7) ** 2);
  dummy.rotation.set(t + i, t * 1.3, 0);
  dummy.updateMatrix();
  target.copy(dummy.matrix);
}

function Motes({ still }: { still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => hdr(C.kristalGlow, 4.5), []);
  const helpers = useMemo(() => ({ m: new THREE.Matrix4(), d: new THREE.Object3D() }), []);

  const place = (t: number) => {
    const im = mesh.current;
    if (!im) return;
    for (let i = 0; i < MOTES; i++) {
      moteMatrix(i, t, helpers.m, helpers.d);
      im.setMatrixAt(i, helpers.m);
    }
    im.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => place(1.2));
  useFrame(({ clock }) => {
    if (!still) place(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MOTES]} frustumCulled={false}>
      <octahedronGeometry args={[0.055, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

export function MonadCrystal({ still }: { still: boolean }) {
  const geometry = useMonadMarkGeometry();
  const crystal = useCrystalMaterial();
  const halo = useGlowMaterial("radial", C.kristal, 2.2, 2.0);
  const beam = useGlowMaterial("beam", C.kristalGlow, 1.5);
  const floor = useGlowMaterial("radial", C.kristal, 1.6, 2.2);
  const shardColor = useMemo(() => hdr(C.kristalGlow, 1.4), []);

  const group = useRef<THREE.Group>(null);
  const haloMesh = useRef<THREE.Mesh>(null);
  const shards = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const mats = useRef({ crystal, halo, beam, floor });

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const m = mats.current;
    m.crystal.uniforms.uPulse.value = pulse;
    m.crystal.uniforms.uTime.value = t;
    m.halo.uniforms.uStrength.value = 1.8 + pulse * 1.0;
    m.beam.uniforms.uTime.value = t;
    m.beam.uniforms.uStrength.value = 1.2 + pulse * 0.6;
    m.floor.uniforms.uStrength.value = 1.2 + pulse * 0.8;
    if (group.current) {
      group.current.rotation.y = t * 0.45;
      group.current.position.y = CRYSTAL_Y + Math.sin(t * 1.2) * 0.12;
    }
    if (haloMesh.current) haloMesh.current.scale.setScalar(1 + pulse * 0.12);
    if (shards.current) shards.current.rotation.y = -t * 0.6;
    if (light.current) light.current.intensity = 16 + pulse * 10;
  });

  return (
    <group>
      {/* Halo behind the mark; it shows through the hole too. */}
      <Billboard position={[0, CRYSTAL_Y, 0]}>
        <mesh ref={haloMesh} material={halo} renderOrder={2}>
          <planeGeometry args={[6.4, 6.4]} />
        </mesh>
      </Billboard>

      <group ref={group} position={[0, CRYSTAL_Y, 0]}>
        <mesh geometry={geometry} material={crystal} rotation={[0, 0, Math.PI / 4]} />
      </group>

      {/* Light falling from the crystal onto the rune circle. */}
      <mesh material={beam} position={[0, (CRYSTAL_Y - 1.1 + FLOOR_Y) / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.45, 2.0, CRYSTAL_Y - 1.1 - FLOOR_Y, 32, 1, true]} />
      </mesh>
      <mesh material={floor} position={[0, FLOOR_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[5.4, 5.4]} />
      </mesh>

      {/* Small squircle shards orbiting the mark */}
      <group ref={shards} position={[0, CRYSTAL_Y, 0]}>
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
              <meshBasicMaterial color={shardColor} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      <group position={[0, CRYSTAL_Y, 0]}>
        <Motes still={still} />
      </group>

      <pointLight ref={light} position={[0, CRYSTAL_Y, 0]} color={C.kristal} intensity={21} distance={11} decay={1.5} />
    </group>
  );
}
