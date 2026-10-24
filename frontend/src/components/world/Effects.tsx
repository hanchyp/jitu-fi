"use client";

// Post-processing: a screen-space ink outline (toon style) plus bloom on the HDR glow parts.
// Only things that write depth get outlined; glow sprites, beams, stars and sparkles do not.

import { Bloom, EffectComposer, createEffectComponent } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";
import { C } from "./toon";

// Laplacian of 1/z is zero on any flat surface in screen space, so only silhouettes and
// creases light up. Lines fade with distance so far peaks stay soft in the fog.
const EDGE_FRAGMENT = /* glsl */ `
uniform vec3 outlineColor;
uniform float thickness;
uniform float fadeNear;
uniform float fadeFar;

float invZ(const in vec2 p) {
  return 1.0 / max(-getViewZ(readDepth(p)), 1e-3);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 o = texelSize * thickness;
  float c = invZ(uv);
  float l = invZ(uv - vec2(o.x, 0.0));
  float r = invZ(uv + vec2(o.x, 0.0));
  float d = invZ(uv - vec2(0.0, o.y));
  float u = invZ(uv + vec2(0.0, o.y));
  float lap = abs(l + r + d + u - 4.0 * c) / c;
  float edge = smoothstep(0.06, 0.2, lap);
  float nearest = 1.0 / max(max(max(c, l), max(r, d)), u);
  edge *= 1.0 - smoothstep(fadeNear, fadeFar, nearest);
  outputColor = vec4(mix(inputColor.rgb, outlineColor, edge), inputColor.a);
}
`;

class ToonEdgesEffect extends Effect {
  constructor({ color = C.outline, thickness = 1.5, fadeNear = 22, fadeFar = 60 } = {}) {
    super("ToonEdgesEffect", EDGE_FRAGMENT, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["outlineColor", new THREE.Uniform(new THREE.Color(color))],
        ["thickness", new THREE.Uniform(thickness)],
        ["fadeNear", new THREE.Uniform(fadeNear)],
        ["fadeFar", new THREE.Uniform(fadeFar)],
      ]),
    });
  }

  get thickness() {
    return this.uniforms.get("thickness")!.value as number;
  }

  set thickness(value: number) {
    this.uniforms.get("thickness")!.value = value;
  }
}

const ToonEdges = createEffectComponent<typeof ToonEdgesEffect, { thickness?: number }>(ToonEdgesEffect);

export function Effects() {
  const dpr = useThree((s) => s.viewport.dpr);
  return (
    <EffectComposer multisampling={dpr > 1.5 ? 0 : 4}>
      <ToonEdges thickness={1.7 * dpr} />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.9} radius={0.72} />
    </EffectComposer>
  );
}
