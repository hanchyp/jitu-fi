"use client";

// Layered night sky on one dome: gradient, a faint star band, two star layers and a toon moon.
// It writes no depth, so the outline pass ignores it and everything else draws in front.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { C } from "./toon";

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uDeep;
uniform vec3 uMoonDir;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float stars(vec3 dir, float scale, float density, float size) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  float h = hash(cell);
  if (h > density) return 0.0;
  vec3 offset = vec3(hash(cell + 1.3), hash(cell + 7.1), hash(cell + 3.7)) * 0.6 + 0.2;
  float d = length(fract(p) - offset);
  float twinkle = 0.65 + 0.35 * sin(uTime * (0.8 + h * 30.0) + h * 400.0);
  return smoothstep(size, 0.0, d) * twinkle;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;

  vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.6, h));
  col = mix(col, uDeep, smoothstep(0.0, -0.35, h));

  // Faint star band (the "milky way"), tilted across the sky.
  vec3 bandAxis = normalize(vec3(0.35, 0.55, 0.75));
  float band = exp(-pow(dot(dir, bandAxis), 2.0) * 14.0);
  float clouds = noise(dir * 4.0) * 0.6 + noise(dir * 9.0) * 0.4;
  col += vec3(0.07, 0.08, 0.2) * band * clouds * smoothstep(-0.05, 0.25, h);

  float above = smoothstep(-0.02, 0.12, h);
  float s = stars(dir, 140.0, 0.09, 0.16) * 0.9 + stars(dir, 60.0, 0.05, 0.12) * 1.6;
  s += stars(dir, 140.0, 0.25, 0.12) * band * 0.7;
  col += vec3(0.9, 0.92, 1.0) * s * above;

  // Toon moon: a flat disc with a darker crescent side and a soft halo.
  float md = acos(clamp(dot(dir, uMoonDir), -1.0, 1.0));
  vec3 shadowDir = normalize(uMoonDir + vec3(0.03, -0.02, 0.0));
  float sd = acos(clamp(dot(dir, shadowDir), -1.0, 1.0));
  float disc = smoothstep(0.052, 0.049, md);
  vec3 moon = mix(vec3(1.25, 1.2, 1.05), vec3(0.62, 0.66, 0.9), smoothstep(0.05, 0.047, sd) * 0.8);
  col = mix(col, moon, disc);
  col += vec3(0.25, 0.3, 0.55) * exp(-md * 9.0) * (1.0 - disc);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function Sky({ still }: { still: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(C.skyTop) },
      uHorizon: { value: new THREE.Color(C.skyHorizon) },
      uDeep: { value: new THREE.Color("#0C1638") },
      uMoonDir: { value: new THREE.Vector3(-0.45, 0.2, -0.87).normalize() },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (still || !material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[100, 32, 16]} />
      <shaderMaterial
        ref={material}
        vertexShader={SKY_VERTEX}
        fragmentShader={SKY_FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
