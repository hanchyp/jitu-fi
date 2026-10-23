// Sprite textures for the skill spells, from public/assets/skill-fx/. The effects are procedural
// (meshes in 3D, SVG in 2D) and swap in a sprite only once its file has shipped, so a missing file
// never shows a broken image or logs a 404.

export type SkillFxName =
  | "freeze-ice"
  | "insurance-shield"
  | "lock-seal"
  | "flip-swirl"
  | "swap-portal"
  | "boost-aura"
  | "spirit-wisp";

/**
 * Sprites that exist in public/assets/skill-fx/. Add a name here when its file lands; the 3D and
 * 2D effects then draw it instead of their procedural stand-in (and fall back again if it fails).
 */
export const SKILL_FX_READY: ReadonlySet<SkillFxName> = new Set<SkillFxName>([]);

export const skillFxUrl = (name: SkillFxName) => `/assets/skill-fx/${name}.webp`;
