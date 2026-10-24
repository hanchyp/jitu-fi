"use client";

// Additive glow materials. They write no depth, so the outline pass never inks them.

import { useMemo } from "react";
import * as THREE from "three";

const UV_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalMatrix * normal;
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

// Soft round falloff on a plane: halos, floor glows.
const RADIAL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uPower;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), uPower);
  gl_FragColor = vec4(uColor * uStrength, a);
}
`;

// Open cylinder of light with streaks running down it, brightest where it meets the floor.
const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float streak = 0.5 + 0.5 * sin(vUv.x * 6.2831 * 7.0 + uTime * 0.6) * sin(vUv.y * 10.0 + uTime * 2.4);
  float a = pow(facing, 1.4) * (0.3 + 0.7 * streak) * mix(1.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  gl_FragColor = vec4(uColor * uStrength, a);
}
`;

export type GlowUniforms = {
  uColor: { value: THREE.Color };
  uStrength: { value: number };
  uPower: { value: number };
  uTime: { value: number };
};

export function useGlowMaterial(kind: "radial" | "beam", color: string, strength: number, power = 2.2) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: UV_VERTEX,
        fragmentShader: kind === "radial" ? RADIAL_FRAGMENT : BEAM_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uStrength: { value: strength },
          uPower: { value: power },
          uTime: { value: 0 },
        } satisfies GlowUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: kind === "beam" ? THREE.DoubleSide : THREE.FrontSide,
        fog: false,
      }),
    [kind, color, strength, power],
  );
}
