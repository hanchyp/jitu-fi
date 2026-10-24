"use client";

// Shared palette, toon material and small geometry helpers for the Arena Jitu scene.

import { useMemo } from "react";
import * as THREE from "three";

export const C = {
  outline: "#0B1626",
  stone: "#7C86A8",
  stoneDark: "#4A5373",
  stoneTop: "#9AA3C2",
  kristal: "#836EF9",
  kristalGlow: "#C4B8FF",
  emas: "#FFC93C",
  skyTop: "#0A1430",
  skyHorizon: "#1E2F63",
  fog: "#1A2858",
} as const;

export const PLAYER_COLORS = ["#FFC93C", "#3DD68C", "#FF6B5E", "#5AA9FF"] as const;

// Three-step gradient map gives the flat cel-shaded look.
export function useToonGradient() {
  return useMemo(() => {
    const data = new Uint8Array([80, 165, 255]);
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }, []);
}

export function Toon({ color, gradient, emissive, emissiveIntensity = 0, vertexColors = false }: {
  color: string;
  gradient: THREE.Texture;
  emissive?: string;
  emissiveIntensity?: number;
  vertexColors?: boolean;
}) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={gradient}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissiveIntensity}
      vertexColors={vertexColors}
    />
  );
}

/** A color pushed above 1.0 so the bloom pass picks it up. */
export function hdr(hex: string, intensity: number) {
  return new THREE.Color(hex).multiplyScalar(intensity);
}

/** Deterministic PRNG (mulberry32), so the world looks the same on every load. */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number, seed: number) {
  // Rounding first makes coincident seam vertices hash to the same value, so the mesh stays closed.
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const h = Math.sin(r(x) * 12.9898 + r(y) * 78.233 + r(z) * 37.719 + seed * 4.123) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * Pushes every vertex by a position-keyed random offset, then splits faces so normals are flat.
 * Turns clean primitives into chunky low-poly rock.
 */
export function craggy(geometry: THREE.BufferGeometry, amount: [number, number, number], seed: number) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x + (hash3(x, y, z, seed) - 0.5) * 2 * amount[0],
      y + (hash3(x, y, z, seed + 1) - 0.5) * 2 * amount[1],
      z + (hash3(x, y, z, seed + 2) - 0.5) * 2 * amount[2],
    );
  }
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  return flat;
}
