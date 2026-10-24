// The three house bots that fill every table next to the player.
// They play to win rounds but never earn season points or touch the bonus pot.
// Every player and every bot can use all six skills; no bot owns or prefers one.

export type HouseBot = {
  name: string;
  short: string;
  portrait: string;
  /** Podium color in the arena (see PLAYER_COLORS in components/world/toon). */
  color: string;
};

export const HOUSE_BOTS: HouseBot[] = [
  { name: "Bruno the Bull", short: "Bruno", portrait: "/assets/landing/portrait-bruno-bull.webp", color: "#7BE35A" },
  { name: "Bera the Bear", short: "Bera", portrait: "/assets/landing/portrait-bera-bear.webp", color: "#5AA9FF" },
  { name: "Dex the Degen", short: "Dex", portrait: "/assets/landing/portrait-dex-degen.webp", color: "#FF6B5E" },
];
