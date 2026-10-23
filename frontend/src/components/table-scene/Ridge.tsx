"use client";

// A pick's price line drawn as a low-poly mountain ridge: a stone silhouette whose skyline is the
// price since the round opened, with a crest strip in the coin's color along the top.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { C, Toon } from "@/components/world/toon";
import { ridgeHeights } from "./model";

const SAMPLES = 32;
const DEPTH = 0.06;
const CREST = 0.06;
/** The lowest point of the skyline, as a share of the ridge height, so it always reads as a hill. */
const FOOT = 0.18;

function useRidgeGeometry(series: readonly number[] | undefined, width: number, height: number) {
  const geometry = useMemo(() => {
    const top = ridgeHeights(series, SAMPLES).map(
      (h, i) => new THREE.Vector2((i / (SAMPLES - 1) - 0.5) * width, (FOOT + h * (1 - FOOT)) * height),
    );
    const extrude = { depth: DEPTH, bevelEnabled: false };

    const body = new THREE.Shape([new THREE.Vector2(-width / 2, 0), ...top, new THREE.Vector2(width / 2, 0)]);
    const crest = new THREE.Shape([...top, ...top.map((p) => new THREE.Vector2(p.x, p.y - CREST)).reverse()]);
    return {
      body: new THREE.ExtrudeGeometry(body, extrude),
      // A hair in front of the body so the strip never z-fights with it.
      crest: new THREE.ExtrudeGeometry(crest, { ...extrude, depth: DEPTH + 0.01 }),
    };
  }, [series, width, height]);

  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.crest.dispose();
    },
    [geometry],
  );
  return geometry;
}

export function Ridge({ series, width, height, tint, dim, gradient }: {
  series: readonly number[] | undefined;
  width: number;
  height: number;
  tint: string;
  dim: boolean;
  gradient: THREE.Texture;
}) {
  const geo = useRidgeGeometry(series, width, height);
  const crest = dim ? C.stone : tint;
  return (
    <group position={[0, 0, -DEPTH / 2]}>
      <mesh geometry={geo.body}>
        <Toon color={dim ? C.stoneDark : C.stone} gradient={gradient} />
      </mesh>
      <mesh geometry={geo.crest} position={[0, 0, -0.005]}>
        <Toon color={crest} gradient={gradient} emissive={crest} emissiveIntensity={dim ? 0 : 0.5} />
      </mesh>
    </group>
  );
}
