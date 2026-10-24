# jitu.fi design brief

Every UI change follows this file and the `frontend-design` skill (`.claude/skills/frontend-design`). The brief wins where they differ, including its explicit choice of a game look.

## Direction: a game world, not a fintech page

The user asked for a **game-ish UI**. The references are illustrated game sites (Chumbi Valley, Sunderfolk):
- a full-bleed illustrated world as the hero
- a chunky outlined wordmark
- bold game buttons
- a dark nav floating over the art

jitu.fi should feel like the title screen of a cozy strategy game, while still saying "your principal is safe".

### The world: Lembah Jitu

- The hero is an original vector illustration of a valley at dusk.
- On a hill stands **Candi Pokok**, a stupa-shaped stone vault, borrowed from Indonesian temple silhouettes. It holds everyone's principal and glows softly. Its message: safe, ancient, not going anywhere.
- **Coin spirits** (BTC, ETH, SOL, MON) float over the valley as glowing orbs. They are the coins you draft.
- Layers, back to front:
  1. sky
  2. sun glow
  3. far mountains
  4. mid hills with the candi
  5. river
  6. near hills
  7. foreground foliage silhouettes framing the edges, as in the references

All art is drawn in SVG in this repo: original, no traced or copied art from the references.

## Tokens

| Name | Hex | Use |
|---|---|---|
| `malam` | `#10213D` | Night: page background below the hero, panels |
| `langit` | `#2A5C9A` | Upper sky, links on dark |
| `senja` | `#F6B26B` | Horizon glow, warm highlights |
| `daun` | `#3E9B4F` | Hills and foliage (plus a darker `#1F5C3A` for depth) |
| `emas` | `#FFC93C` | Primary CTA, coins, rewards. Outline `#6B3F00` |
| `garis` | `#0B1626` | The heavy outline on game elements |

`naik` `#3DD68C` and `turun` `#FF6B5E` are used only for Buy/Sell on cards.

**Type:**
- **Titan One** for the wordmark, headings and buttons. It gets a 3–6 px dark stroke and a hard drop shadow on the wordmark.
- **Nunito** (600–800) for body and UI text.
- Sentence case. The game look comes from type weight and outlines, not from all-caps.

**Shapes:**
- Game buttons are pill-ish (radius 14 px), with a 3 px `garis` outline and a 5 px solid bottom "bevel" that collapses on press.
- Panels are dark `malam` boards with a 3 px outline, an inner highlight line, and a slight tilt only on quest cards.
- No glassmorphism, no neon gradients.

## Layout

```
┌ testnet strip ───────────────────────────────────────────┐
│ [logo]   Cara main  Bunga  Musim          [Setor mUSD]   │  ← dark pill nav over the art
│                                                          │
│                 (chunky "jitu.fi" wordmark)              │
│        Deposito yang bisa kamu mainkan. (subtitle)       │
│            [ Main sekarang ]  [ Lihat cara main ]        │
│   coins floating     Candi Pokok on hill     foliage     │
├──────────── torn edge into night ────────────────────────┤
│ Cara main: 3 quest cards (Setor / Main / Klaim)          │
│ Pembagian bunga: loot bar (15 | 42,5 | 42,5)             │
│ Musim demo: season banner with 4 stat badges             │
│ Aturan lembah: 3 rules (no buy-in, principal safe, no luck)│
│ Final CTA over a small candi silhouette                  │
└──────────────────────────────────────────────────────────┘
```

The hero is centered, as a title screen should be. The sections below are left-aligned for reading.

## Motion

- **One orchestrated title-screen moment** on load:
  1. The camera rises: the layers slide up from offset positions at different speeds.
  2. The wordmark drops in with a squash-and-bounce.
  3. The buttons pop in.
- **Ambient idle loops** that a game title screen needs, all subtle and slow: coin spirits bob, and the candi glow breathes.
- Pointer parallax on desktop: the layers shift a few pixels at depth-scaled amounts.
- Button press: the bevel collapses (translateY 4 px). The hover lift applies only to buttons.
- `prefers-reduced-motion`: no entrance, no idle loops, no parallax.
- Library: `motion` (`motion/react`).

## Copy

- Indonesian, playful but plain.
- The primary CTA is "Main sekarang" and leads to the deposit flow. The nav CTA is "Setor mUSD".
- The required "Testnet · simulasi" banner stays.
