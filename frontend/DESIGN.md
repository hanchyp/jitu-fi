# jitu.fi design brief

Every UI change follows this file and the `frontend-design` skill (`.claude/skills/frontend-design`). The brief wins where they differ, including its explicit choice of a game look.

## Direction: a game title screen in 3D

The user asked for a **game-ish UI** in **3D**. The references are illustrated game sites (Chumbi Valley, Sunderfolk):
- a full-bleed world as the hero
- a chunky outlined wordmark
- bold game buttons
- a dark nav floating over the art

jitu.fi should feel like the title screen of a stylized strategy game, while still saying "your principal is safe".

### The world: Arena Jitu

The hero is a real-time 3D scene (three.js via React Three Fiber), low-poly with toon shading and heavy dark outlines, so it matches the 2D game UI around it.

- **The arena:** a round stone duel platform floating at night, with a ring of pillars and a glowing rune circle. It is where the duels happen.
- **Kristal Pokok:** a large Monad-purple crystal hovering at the center of the arena. It holds everyone's principal. It slowly turns and pulses, and nothing in the arena touches it. This is the visual promise that principal is safe while players compete around it.
- **Four podiums** around the crystal, one per player (a table seats 4).
- **Coin spirits** (BTC, ETH, SOL, MON) orbit above the arena as gold coins. They are what you draft.
- **Setting:** a night sky with stars, distant low-poly peaks, and floating sparkles.

The crystal replaced an earlier temple (stupa) idea. A sacred religious building should not be used as a money vault.

## Tokens

| Name | Hex | Use |
|---|---|---|
| `malam` | `#10213D` | Page background below the hero, panels |
| `langit` | `#2A5C9A` | Secondary panels, links on dark |
| `kristal` | `#836EF9` | Monad purple: crystal, rune glow, accents |
| `kristal-terang` | `#C4B8FF` | Crystal highlights, glow halos |
| `emas` | `#FFC93C` | Primary CTA, coins, rewards. Outline `#6B3F00` |
| `garis` | `#0B1626` | The heavy outline on game elements and 3D meshes |

There are also two scene-only colors:
- stone `#7C86A8`, with a dark side `#4A5373`
- sky `#0A1430` fading to `#1E2F63`

`naik` `#3DD68C` and `turun` `#FF6B5E` are used only for Buy/Sell on cards.

**Type:**
- **Titan One** for the wordmark, headings and buttons, with a dark stroke and a hard drop shadow on the wordmark.
- **Nunito** (600–900) for body and UI text.
- Sentence case.

**Shapes:**
- Game buttons are pill-ish (radius 14 px), with a 3 px `garis` outline and a 5 px solid bottom bevel that collapses on press.
- Panels are dark boards with a 3 px outline. Quest cards are slightly tilted.
- No glassmorphism, no neon gradient washes. The purple lives in the crystal and the runes, not in backgrounds.

## Layout

```
┌ testnet strip ───────────────────────────────────────────┐
│ [logo]   Cara main  Bunga  Musim          [Setor mUSD]   │  ← dark pill nav over the scene
│                 (chunky "jitu.fi" wordmark)              │
│              Deposito yang bisa kamu mainkan.            │
│       coins orbit     ◆ crystal over arena ◆             │
│               4 podiums around the platform              │
│            [ Main sekarang ]  [ Cara main ]              │
├──────────── torn edge into night ────────────────────────┤
│ Cara main: 3 quest cards (Setor / Main / Klaim)          │
│ Pembagian bunga: loot bar (15 | 42,5 | 42,5)             │
│ Musim demo: season banner with 4 stat badges             │
│ Aturan arena: 3 rules (no buy-in, principal safe, no luck)│
│ Final CTA                                                │
└──────────────────────────────────────────────────────────┘
```

## Motion

- **One orchestrated title-screen moment** on load:
  1. The camera flies in from high and far, then settles on the arena.
  2. The wordmark drops in with a bounce.
  3. The buttons pop in.
- **Ambient idle loops**, slow and subtle: the crystal turns and pulses, coins orbit and spin, sparkles drift.
- Pointer parallax on desktop: the camera eases a few degrees toward the cursor.
- `prefers-reduced-motion`: no fly-in, no idle loops, no parallax. A still frame of the scene.
- **Fallback:** without WebGL, or while the 3D bundle loads, a static night backdrop with a CSS crystal glow is shown. The page never blocks on the 3D scene.
- Libraries: three.js with `@react-three/fiber` and `@react-three/drei` for the scene; `motion` (`motion/react`) for the 2D UI.

## Copy

- Indonesian, playful but plain.
- The primary CTA is "Main sekarang" and leads to the deposit flow. The nav CTA is "Setor mUSD".
- The required "Testnet · simulasi" banner stays.
