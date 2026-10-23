// Dev states for /dev/skills, default first.
export const STATES = [
  "playable",
  "commit",
  "not-live",
  "past-deadline",
  "used",
  "pick-affected",
  "empty",
  "incoming-freeze",
  "all-effects",
] as const;

export type SkillsState = (typeof STATES)[number];
