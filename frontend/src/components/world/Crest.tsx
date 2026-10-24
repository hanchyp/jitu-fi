"use client";

// The jitu.fi crest in 3D for the title intro: it pops in while the camera flies over the arena,
// glints, then flies into the hero wordmark and hands off to the 2D logo (TitleScreen).
// Modelled in code: an extruded shield with a chamfered gold bevel, a recessed navy face, a
// raised ivory "J" and an emerald gem. Outlines come from the toon edge pass like everything else.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useGlowMaterial } from "./glow";
import { C } from "./toon";

// Outlines traced from the crest artwork (public/brand/jitu-crest.webp, 828 × 907 px):
// the outer edge of the gold rim, the inner edge (the navy face) and the "J".
const RIM =
  "M414 15 L509 82 L704 129 L757 194 L808 240 L781 363 L764 376 L744 475 L727 565 L740 595 L721 695 L607 781 L414 890 L221 780 L106 694 L90 591 L101 568 L77 441 L64 376 L47 363 L17 245 L69 196 L124 130 L319 81 Z";
const FACE =
  "M414 80 L494 133 L673 167 L689 203 L736 277 L680 655 L612 718 L526 774 L417 833 L308 777 L224 723 L148 654 L92 283 L141 200 L155 168 L334 134 Z";
const LETTER_J =
  "M599 205 L597 280 L579 302 L580 652 L418 749 L380 745 L338 736 L305 725 L268 706 L243 687 L225 667 L208 637 L201 613 L199 589 L200 571 L207 546 L216 529 L235 508 L264 491 L324 467 L308 502 L301 535 L303 567 L311 586 L323 601 L335 611 L351 620 L364 625 L390 630 L407 630 L428 626 L447 618 L463 607 L479 591 L488 578 L496 555 L497 312 L477 292 Z";
const GEM = { x: 412, y: 251, r: 55 };
const GLINT = { x: 757, y: 194 };

// Artwork pixels to crest units: centred on the shield, y up, about 2 units tall.
const PX = 1 / 440;
const CENTER = { x: 412, y: 452 };
const CREST_HEIGHT = 875 * PX;
const toUnits = (x: number, y: number) => new THREE.Vector2((x - CENTER.x) * PX, (CENTER.y - y) * PX);

/** Parses the absolute M/L/Z polygon paths above into a Shape. */
function shapeFromPath(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const points: THREE.Vector2[] = [];
  for (let i = 0; i < n.length; i += 2) points.push(toUnits(n[i], n[i + 1]));
  return new THREE.Shape(points);
}

// The logo is flat-lit from the upper left: every facet takes the lit, base or shade tone of its
// part from its normal. Baked into vertex colors, so the arena's purple crystal light never tints
// the brand colors.
const LIGHT = new THREE.Vector3(-0.55, 0.65, 0.5).normalize();
const TONES = {
  gold: ["#F6D782", "#DAAE4B", "#A17728"],
  face: ["#1B4A6B", "#113048", "#0B2236"],
  ivory: ["#FFFFFF", "#F2EDE1", "#CFC6B2"],
  gem: ["#A6F7DA", "#40D0A3", "#1E9C78"],
} as const;

function bakeTones(geometry: THREE.BufferGeometry, [lit, base, shade]: readonly [string, string, string]) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tones = [lit, base, shade].map((hex) => new THREE.Color(hex));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const n = c.sub(b).cross(a.sub(b)).normalize();
    const d = n.dot(LIGHT);
    const tone = tones[d > 0.75 ? 0 : d > 0.1 ? 1 : 2];
    for (let k = 0; k < 3; k++) tone.toArray(colors, (i + k) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

function useCrestGeometries() {
  return useMemo(() => {
    const rimShape = shapeFromPath(RIM);
    rimShape.holes.push(new THREE.Path(shapeFromPath(FACE).getPoints()));
    // One bevel segment makes a flat chamfer, which the toon ramp shades like the logo's bevel.
    const rim = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 1,
    });
    const face = new THREE.ExtrudeGeometry(shapeFromPath(FACE), { depth: 0.12, bevelEnabled: false });
    const letter = new THREE.ExtrudeGeometry(shapeFromPath(LETTER_J), {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.018,
      bevelSegments: 1,
    });
    const gem = new THREE.OctahedronGeometry(GEM.r * PX * 1.05, 0);
    gem.scale(1, 1, 0.55);
    return {
      rim: bakeTones(rim, TONES.gold),
      face: bakeTones(face, TONES.face),
      letter: bakeTones(letter, TONES.ivory),
      gem: bakeTones(gem, TONES.gem),
    };
  }, []);
}

// Timeline in seconds from the first rendered frame.
const T = { enter: 0.6, glint: 0.95, glintEnd: 1.5, travel: 1.7, handoff: 2.05, arrive: 2.3, gone: 2.5 } as const;
const DEPTH = 4; // distance in front of the camera

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutBack = (x: number) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export type CrestIntroProps = {
  /** The 2D wordmark the crest flies into. */
  target: RefObject<HTMLElement | null>;
  /** Called on the first rendered frame of the intro. */
  onStart: () => void;
  /** Called once as the crest reaches the wordmark, so the 2D logo can take over. */
  onHandoff: () => void;
};

export function CrestIntro({ target, onStart, onHandoff }: CrestIntroProps) {
  const geo = useCrestGeometries();
  const holder = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const gold = useRef<THREE.MeshBasicMaterial>(null);
  const glint = useRef<THREE.Group>(null);
  const burst = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const handedOff = useRef(false);
  const [done, setDone] = useState(false);
  const flat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), []);
  const glintMaterial = useGlowMaterial("radial", C.gading, 3.2, 2.4);
  const burstMaterial = useGlowMaterial("radial", C.emas, 2.4, 2.0);
  const burstUniforms = useRef(burstMaterial.uniforms);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), from: new THREE.Vector2(), to: new THREE.Vector2() }), []);
  const glintAt = useMemo(() => toUnits(GLINT.x, GLINT.y), []);
  const gemAt = useMemo(() => toUnits(GEM.x, GEM.y), []);

  useFrame(({ clock, camera, size, gl }) => {
    const h = holder.current;
    if (!h || done) return;
    if (start.current === null) {
      start.current = clock.elapsedTime;
      onStart();
    }
    const t = clock.elapsedTime - start.current;
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    const unitsPerPx = (2 * DEPTH * Math.tan(fov / 2)) / size.height;

    // Screen spots in px from the canvas top-left: centre stage first, then the wordmark.
    const stagePx = Math.min(size.height * 0.4, (size.width * 0.62) / 0.92);
    tmp.from.set(size.width / 2, size.height * 0.47);
    tmp.to.set(size.width / 2, size.height * 0.2);
    let targetPx = stagePx * 0.35;
    const el = target.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const c = gl.domElement.getBoundingClientRect();
      tmp.to.set(r.left + r.width / 2 - c.left, r.top + r.height / 2 - c.top);
      targetPx = el.offsetHeight;
    }

    const enter = clamp01(t / T.enter);
    const travel = easeInOut(clamp01((t - T.travel) / (T.arrive - T.travel)));
    const vanish = easeInOut(clamp01((t - T.arrive) / (T.gone - T.arrive)));
    const bob = Math.sin(t * 2.2) * 6 * enter * (1 - travel);
    const x = THREE.MathUtils.lerp(tmp.from.x, tmp.to.x, travel);
    const y = THREE.MathUtils.lerp(tmp.from.y, tmp.to.y, travel) + bob;
    const heightPx = THREE.MathUtils.lerp(stagePx, targetPx, travel) * easeOutBack(enter) * (1 - vanish);

    // Pinned in front of the camera, so it rides along with the fly-in.
    tmp.pos.set((x - size.width / 2) * unitsPerPx, (size.height / 2 - y) * unitsPerPx, -DEPTH);
    tmp.pos.applyQuaternion(camera.quaternion).add(camera.position);
    h.position.copy(tmp.pos);
    h.quaternion.copy(camera.quaternion);
    h.scale.setScalar(Math.max(1e-3, (heightPx * unitsPerPx) / CREST_HEIGHT));

    if (spin.current) {
      const settle = 1 - travel;
      spin.current.rotation.y = -Math.pow(1 - enter, 3) * Math.PI * 2 + Math.sin(t * 1.6) * 0.22 * settle;
      spin.current.rotation.x = Math.sin(t * 1.1) * 0.06 * settle;
    }

    // Gold glint: a star flare on the rim corner while the whole bevel catches the light.
    const g = clamp01((t - T.glint) / (T.glintEnd - T.glint));
    const flash = Math.sin(Math.PI * g);
    // Pushing the gold above 1.0 lets the bloom pass flare it.
    if (gold.current) gold.current.color.setScalar(1 + flash * 0.55);
    if (glint.current) {
      glint.current.scale.setScalar(Math.max(1e-3, flash));
      glint.current.rotation.z = g * Math.PI * 0.5;
    }

    // A soft gold burst where the crest lands, covering the swap to the 2D logo.
    const b = burst.current;
    if (b) {
      const u = clamp01((t - T.handoff) / (T.gone + 0.2 - T.handoff));
      b.visible = u > 0 && u < 1;
      b.position.copy(tmp.pos);
      b.quaternion.copy(camera.quaternion);
      b.scale.setScalar(Math.max(1e-3, targetPx * unitsPerPx * (1.2 + 2.2 * u)));
      burstUniforms.current.uStrength.value = 2.4 * Math.sin(Math.PI * u);
    }

    if (!handedOff.current && t >= T.handoff) {
      handedOff.current = true;
      onHandoff();
    }
    if (t >= T.gone + 0.2) setDone(true);
  });

  if (done) return null;
  return (
    <>
      <group ref={holder}>
        <group ref={spin}>
          <group position={[0, 0, -0.1]}>
            <mesh geometry={geo.rim}>
              <meshBasicMaterial ref={gold} vertexColors toneMapped={false} />
            </mesh>
            <mesh geometry={geo.face} material={flat} />
            <mesh geometry={geo.letter} position={[0, 0, 0.12]} material={flat} />
            <mesh geometry={geo.gem} position={[gemAt.x, gemAt.y, 0.16]} material={flat} />
          </group>
          <group ref={glint} position={[glintAt.x, glintAt.y, 0.2]}>
            <mesh material={glintMaterial} renderOrder={4}>
              <planeGeometry args={[1.1, 0.08]} />
            </mesh>
            <mesh material={glintMaterial} renderOrder={4} rotation={[0, 0, Math.PI / 2]}>
              <planeGeometry args={[1.1, 0.08]} />
            </mesh>
            <mesh material={glintMaterial} renderOrder={4}>
              <planeGeometry args={[0.3, 0.3]} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh ref={burst} material={burstMaterial} renderOrder={4} visible={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}
