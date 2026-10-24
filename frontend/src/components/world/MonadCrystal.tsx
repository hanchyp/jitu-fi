"use client";

// The Principal Crystal: the Monad mark (a squircle ring standing on its corner) as a cut gem,
// lit from inside, backlit by a ring of glow, with a beam onto the rune circle and light motes.

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGlowMaterial } from "./glow";
import { C, hdr } from "./toon";

export const CRYSTAL_Y = 2.75;
const FLOOR_Y = 0.28;

// The Monad mark traced from the official 24x24 logo path (@web3icons/core): a squircle standing
// on its corner with a rounded-square hole set slightly askew. Centered, y up, `scale` per unit.
function monadMarkShape(scale: number) {
  const p = (x: number, y: number) => [(x - 12) * scale, (12 - y) * scale] as const;
  const shape = new THREE.Shape();
  shape.moveTo(...p(12, 3));
  shape.bezierCurveTo(...p(9.401, 3), ...p(3, 9.4), ...p(3, 12));
  shape.bezierCurveTo(...p(3, 14.6), ...p(9.401, 21), ...p(12, 21));
  shape.bezierCurveTo(...p(14.599, 21), ...p(21, 14.599), ...p(21, 12));
  shape.bezierCurveTo(...p(21, 9.401), ...p(14.599, 3), ...p(12, 3));
  const hole = new THREE.Path();
  hole.moveTo(...p(10.598, 17.146));
  hole.bezierCurveTo(...p(9.501, 16.848), ...p(6.555, 11.693), ...p(6.854, 10.597));
  hole.bezierCurveTo(...p(7.153, 9.501), ...p(12.307, 6.555), ...p(13.403, 6.854));
  hole.bezierCurveTo(...p(14.498, 7.152), ...p(17.445, 12.307), ...p(17.146, 13.403));
  hole.bezierCurveTo(...p(16.848, 14.498), ...p(11.693, 17.445), ...p(10.598, 17.146));
  shape.holes.push(hole);
  return shape;
}

// The mark is 3 units corner to corner. A thin single-step chamfer gives a gem edge that
// catches light without rounding off the silhouette.
const MARK_SCALE = 3 / 18;
// Anything closer to the center than this is the rim of the hole (its corners sit at ~0.89).
const HOLE_EDGE = 1.05;

function useMonadMarkGeometry() {
  return useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(monadMarkShape(MARK_SCALE), {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.05,
      bevelSegments: 1,
      curveSegments: 20,
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

// Flat normals from screen derivatives. The big front and back faces get one clean purple with a
// soft top-to-bottom shade and a slow sheen; the chamfers are the bright gem edges (the hole's
// edge glows, as if lit from inside); the side walls stay dark so the silhouette reads.
const CRYSTAL_FRAGMENT = /* glsl */ `
uniform float uPulse;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uFace;
uniform vec3 uLight;
uniform vec3 uRim;
uniform float uHoleEdge;
varying vec3 vViewPos;
varying vec3 vObjPos;
varying vec3 vLight;
void main() {
  vec3 objN = normalize(cross(dFdx(vObjPos), dFdy(vObjPos)));
  vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  float ndl = dot(n, vLight);
  float az = abs(objN.z);
  float hole = 1.0 - step(uHoleEdge, length(vObjPos.xy));
  vec3 col;
  if (az > 0.97) {
    float shade = smoothstep(-1.6, 1.6, vObjPos.y - vObjPos.x * 0.35);
    col = mix(uMid, uFace, shade);
    float sweep = fract(uTime * 0.12) * 5.0 - 2.5;
    col += uLight * 0.16 * smoothstep(0.22, 0.0, abs(vObjPos.x + vObjPos.y * 0.6 - sweep));
    col *= 0.96 + 0.08 * uPulse;
  } else if (az > 0.2) {
    col = ndl > 0.15 ? uLight : uMid;
    col = mix(col, uRim * (0.85 + 0.35 * uPulse), hole);
  } else {
    col = ndl > 0.3 ? uMid : uDeep;
    col = mix(col, uRim * 0.4, hole * 0.7);
  }
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
          uMid: { value: new THREE.Color("#6A55EE") },
          uFace: { value: new THREE.Color(C.kristal).lerp(new THREE.Color(C.kristalGlow), 0.35) },
          uLight: { value: new THREE.Color("#E6E0FF") },
          uRim: { value: hdr(C.kristalGlow, 2.0) },
          uHoleEdge: { value: HOLE_EDGE },
        },
      }),
    [],
  );
}

const MOTES = 22;

function moteMatrix(i: number, t: number, target: THREE.Matrix4, dummy: THREE.Object3D) {
  const orbit = i % 3;
  const k = Math.floor(i / 3);
  // Steep tilts carry the motes over and under the mark instead of across its face.
  const radius = [2.2, 2.5, 2.8][orbit];
  const speed = [0.9, -0.65, 0.5][orbit];
  const tilt = [-0.8, 0.8, -0.7][orbit];
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
  const halo = useGlowMaterial("radial", C.kristal, 2.6, 1.6, 0.48);
  const beam = useGlowMaterial("beam", C.kristalGlow, 1.5);
  const floor = useGlowMaterial("radial", C.kristal, 1.6, 2.2);

  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const mats = useRef({ crystal, halo, beam, floor });

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const m = mats.current;
    m.crystal.uniforms.uPulse.value = pulse;
    m.crystal.uniforms.uTime.value = t;
    m.halo.uniforms.uStrength.value = 2.2 + pulse * 0.8;
    m.beam.uniforms.uTime.value = t;
    m.beam.uniforms.uStrength.value = 1.2 + pulse * 0.6;
    m.floor.uniforms.uStrength.value = 1.2 + pulse * 0.8;
    if (group.current) {
      // Sway rather than spin: the mark never turns edge-on, so it always reads as the logo.
      group.current.rotation.y = Math.sin(t * 0.5) * 0.4;
      group.current.position.y = CRYSTAL_Y + Math.sin(t * 1.2) * 0.12;
    }
    if (light.current) light.current.intensity = 16 + pulse * 10;
  });

  return (
    <group>
      {/* Backlight ring hugging the silhouette. Its core is dark, so the hole stays see-through. */}
      <Billboard position={[0, CRYSTAL_Y, 0]}>
        <mesh material={halo} renderOrder={2}>
          <planeGeometry args={[6.4, 6.4]} />
        </mesh>
      </Billboard>

      <group ref={group} position={[0, CRYSTAL_Y, 0]}>
        <mesh geometry={geometry} material={crystal} />
      </group>

      {/* Light falling from the crystal onto the rune circle. */}
      <mesh material={beam} position={[0, (CRYSTAL_Y - 1.1 + FLOOR_Y) / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.45, 2.0, CRYSTAL_Y - 1.1 - FLOOR_Y, 32, 1, true]} />
      </mesh>
      <mesh material={floor} position={[0, FLOOR_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[5.4, 5.4]} />
      </mesh>

      <group position={[0, CRYSTAL_Y, 0]}>
        <Motes still={still} />
      </group>

      <pointLight ref={light} position={[0, CRYSTAL_Y, 0]} color={C.kristal} intensity={21} distance={11} decay={1.5} />
    </group>
  );
}
