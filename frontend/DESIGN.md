# jitu.fi design brief

Every UI change follows this file and the `frontend-design` skill (`.claude/skills/frontend-design`). The brief wins where they differ, including its explicit choice of a game look.

## Direction: a game title screen in 3D

The user asked for a **game-ish UI** in **3D**. The references are illustrated game sites (Chumbi Valley, Sunderfolk):
- a full-bleed world as the hero
- the crest logo and its chunky outlined wordmark
- bold game buttons
- a dark nav floating over the art

jitu.fi should feel like the title screen of a stylized strategy game, while still saying "your principal is safe".

### The world: Arena Jitu

The hero is a real-time 3D scene (three.js via React Three Fiber), low-poly with toon shading and heavy dark outlines, so it matches the 2D game UI around it.

- **The arena:** a round stone duel platform floating at night, with a ring of pillars and a glowing rune circle. It is where the duels happen.
- **Principal Crystal:** a large crystal in the shape of the Monad mark hovering at the center of the arena. It holds everyone's principal. It slowly turns and pulses, and nothing in the arena touches it. This is the visual promise that principal is safe while players compete around it.
- **Four podiums** around the crystal, one per player (a table seats 4).
- **Coin spirits** (BTC, ETH, SOL, MON) orbit above the arena as gold coins. They are what you draft.
- **Setting:** a night sky with stars, distant low-poly peaks, and floating sparkles.

The crystal replaced an earlier temple (stupa) idea. A sacred religious building should not be used as a money vault.

## Logo

The official logo is the **adventure crest**: a navy shield with a chamfered gold bevel, an ivory "J", emerald gems, and the "Jitu.fi" wordmark below it. The source artwork is `frontend/brand/jitu-adventure-crest-v1.png`; never redraw or recolor it.

Crops in `frontend/public/brand/`:
- `jitu-lockup` (crest above wordmark), `jitu-crest` (shield only), `jitu-wordmark` (wordmark only), as WebP plus PNG fallbacks.
- `jitu-wordmark-gold.webp` is a mask of the wordmark's gold edges, used for the shine sweep.

Where it is used:
- **Nav:** a horizontal lockup, crest icon then wordmark, linking home.
- **Hero:** the wordmark alone, not the full lockup, so the arena stays visible under it and the crest is not shown twice next to the nav. It keeps a visually hidden `<h1>jitu.fi</h1>`. A light shine sweeps over its gold edges every few seconds (none under reduced motion).
- **Favicon and app icons:** the crest only (`src/app/favicon.ico`, `icon.png`, `apple-icon.png`).
- **3D crest:** the crest is modelled in code (`components/world/Crest.tsx`) from outlines traced off the artwork. It plays in the intro, then flies into the hero wordmark.

## Tokens

The palette follows the logo.

| Name | Hex | Use |
|---|---|---|
| `garis` | `#040B10` | Ink: the heavy outline on game elements and 3D meshes, hard drop shadows |
| `malam` | `#113048` | Navy: page background below the hero, panels |
| `papan` | `#18405E` | Raised boards and cards on navy (`papan-terang` `#225378` when active) |
| `dasar` | `#0A2235` | Deep bands (champions, footer), skill chips |
| `langit` | `#2E6A8E` | Secondary panels, the base-yield bar |
| `gading` | `#F2EDE1` | Ivory: section headings, logo letters |
| `emas` | `#DAAE4B` | Gold: primary CTA, coins, rewards. Bevel `emas-tua` `#A17728` |
| `zamrud` | `#40D0A3` | Emerald: brand accent (skills, highlights). Never a Buy signal |
| `kristal` | `#836EF9` | Monad purple: **only** the Monad crystal, its glow and the runes |
| `kristal-terang` | `#C4B8FF` | Crystal highlights and glow halos only |

There are also scene-only colors:
- stone `#7C86A8`, with a dark side `#4A5373`
- sky `#071624` fading to `#1A4664` (navy, from the logo), fog `#173E5A`

`naik` `#7BE35A` and `turun` `#FF6B5E` are used only for Buy/Sell. The Buy green is a brighter yellow-green, kept clearly apart from the emerald accent.

Contrast on navy `#113048` (WCAG): white 13.6:1, white/70 7.5:1, white/55 5.2:1, ivory 11.7:1, gold 6.6:1, emerald 7.0:1. Ink on gold 9.6:1, ink on Buy green 12.2:1. All pass AA for body text.

**Type:**
- **Bree Serif** for headings and buttons: a friendly slab with a classic card-game feel, chosen over cartoon display faces (Titan One read as meme-coin) and costume fonts (pirate, uncial). Headings get a thin dark stroke (0.05em) and a hard drop shadow; heavier outlines blur its letterforms. The wordmark is the logo image, not live text.
- **Nunito** (600–900) for body and UI text.
- Sentence case.

**Shapes:**
- Game buttons are pill-ish (radius 14 px), with a 3 px `garis` outline and a 5 px solid bottom bevel that collapses on press.
- Panels are dark boards with a 3 px outline. Quest cards are slightly tilted.
- No glassmorphism, no neon gradient washes. The purple lives in the crystal and the runes, not in backgrounds or UI.

## Layout

```
┌ testnet strip ───────────────────────────────────────────┐
│ [crest+wordmark]  How to play  Yield  Season  [Deposit]  │  ← dark pill nav over the scene
│                 (crest logo wordmark)                    │
│                 The deposit you can play.                │
│       coins orbit     ◆ crystal over arena ◆             │
│               4 podiums around the platform              │
│              [ Play now ]  [ How to play ]               │
├──────────── torn edge into night ────────────────────────┤
│ How to play: 3 quest cards (Deposit / Play / Claim)      │
│ Where the yield goes: loot bar (15 | 42.5 | 42.5)        │
│ Demo season: season banner with 4 stat badges            │
│ Arena rules: 3 rules (no buy-in, principal safe, no luck)│
│ Final CTA                                                │
└──────────────────────────────────────────────────────────┘
```

## Motion

- **One orchestrated title-screen moment** on load:
  1. The camera flies in from high and far, then settles on the arena.
  2. Meanwhile the 3D crest spins in at center stage, glints, then flies up into the wordmark's spot and shrinks into it; the 2D wordmark pops in under a gold burst, followed by the tagline.
  3. The buttons pop in on their own schedule; the intro never delays them.
- If the 3D chunk has not drawn the crest within about 2 s, the crest is skipped and the wordmark drops in with a bounce, as it also does without WebGL.
- **Ambient idle loops**, slow and subtle: the crystal turns and pulses, coins orbit and spin, sparkles drift.
- Pointer parallax on desktop: the camera eases a few degrees toward the cursor.
- `prefers-reduced-motion`: no fly-in, no crest intro, no shine, no idle loops, no parallax. A still frame of the scene with the 2D logo in place.
- **Fallback:** without WebGL, or while the 3D bundle loads, a static night backdrop with a CSS crystal glow is shown. The page never blocks on the 3D scene.
- Libraries: three.js with `@react-three/fiber` and `@react-three/drei` for the scene; `motion` (`motion/react`) for the 2D UI.

## Copy

- English, playful but plain. Numbers use en-US formatting ("1,000 mUSD", "42.5").
- The primary CTA is "Play now" and leads to the deposit flow. The nav CTA is "Deposit mUSD".
- The required "Testnet · simulation" banner stays.
- In-world names: the crystal is the "Principal Crystal".
