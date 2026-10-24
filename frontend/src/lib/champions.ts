// The three house champions (bots) that fill every table next to the player.
// They play to win rounds but never earn season points or touch the bonus pot.

export type Champion = {
  name: string;
  short: string;
  title: string;
  line: string;
  skills: string[];
  portrait: string;
  /** Podium color in the arena (see PLAYER_COLORS in components/world/toon). */
  color: string;
};

export const CHAMPIONS: Champion[] = [
  {
    name: "Bruno the Bull",
    short: "Bruno",
    title: "Always optimistic",
    line: "Piles on Buys and never met a BOOST he didn't like.",
    skills: ["Buy", "BOOST"],
    portrait: "/assets/landing/portrait-bruno-bull.webp",
    color: "#7BE35A",
  },
  {
    name: "Bera the Bear",
    short: "Bera",
    title: "Patient and defensive",
    line: "Sells calmly, hides behind INSURANCE and FREEZEs your best call.",
    skills: ["Sell", "INSURANCE", "FREEZE"],
    portrait: "/assets/landing/portrait-bera-bear.webp",
    color: "#5AA9FF",
  },
  {
    name: "Dex the Degen",
    short: "Dex",
    title: "Chaotic trickster",
    line: "FLIPs calls and SWAPs coins mid-round, just to see what happens.",
    skills: ["FLIP", "SWAP"],
    portrait: "/assets/landing/portrait-dex-degen.webp",
    color: "#FF6B5E",
  },
];
