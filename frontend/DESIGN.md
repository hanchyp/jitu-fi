# jitu.fi design brief

Every UI change follows this file and the `frontend-design` skill (`.claude/skills/frontend-design`). The brief wins over the skill where they differ.

## Subject, audience, job

- **Subject:** a time deposit you can play. Indonesians know *deposito* as a bank product with a printed certificate (bilyet deposito). jitu.fi keeps that sense of safety and adds a short crypto draft game on top.
- **Audience:**
  - hackathon judges, who see it for the first time on a laptop or projector
  - crypto-curious Indonesians, mostly on phones
- **Primary job of the landing page:** within 5 seconds, a visitor understands three things: the principal is safe, they play to win a bigger share of the interest, and "Setor mUSD" is the first step.

## Direction: bilyet meets draft card

Two objects from the subject's world carry the whole identity:

1. **The bilyet (deposit certificate).** It stands for the safe side. Its features are a security-paper tint, fine guilloche line patterns, a serial number, and a stamp.
2. **The draft card (coin card).** It stands for the game side. Each card shows a coin, a direction (Naik / Turun), and the contrarian multiplier.

The memorable element is the hero, where coin cards are dealt onto a bilyet. Everything else stays quiet: plain paper, ink, generous spacing.

## Tokens

| Name | Hex | Use |
|---|---|---|
| `kertas` (security paper) | `#EDF1EE` | Page background, cool grey-green. Not cream. |
| `tinta` (ink) | `#142847` | Text, primary buttons, card backs. Not a near-black. |
| `guilloche` | `#6A5AD8` | Security patterns, focus rings, links. A nod to Monad violet, used as line work only, never as gradient washes. |
| `naik` | `#178A52` | Buy / up / gains |
| `turun` | `#C8413A` | Sell / down / losses |

There are also derived tints for surfaces and borders. Each one is the base color at a lower opacity, so no new hues are introduced.

**Type:** one family, **Schibsted Grotesk** (400–900).
- The headline is set large and tight (weight 800, tracking −0.03em). The type itself does the work, with no accented words.
- Body text is 400 at 17–18 px, with line length ≤ 70ch.
- All figures use `tabular-nums`, so prices and amounts line up like a ledger.
- Sentence case everywhere. No all-caps labels.

**Shape:** radius follows hierarchy rather than one value everywhere.
- The bilyet has a 4 px radius, because it is paper.
- Coin cards have a 14 px radius, because they are cards in hand.
- Buttons are 10 px.
- There are no grey drop shadows. Depth comes from ink-tinted borders and a single offset "paper on paper" shadow on the bilyet.

## Layout

Left-aligned throughout. Text sits in one column with the visual beside it on desktop, and stacked on mobile.

```
┌ Testnet · simulasi strip ───────────────────────────┐
│ jitu.fi                               [Setor mUSD]  │
├─────────────────────────────────────────────────────┤
│ Deposito yang bisa        ┌ bilyet ──────────────┐  │
│ kamu mainkan.             │ No. 0001  Musim #1   │  │
│ pitch paragraph           │ Pokok 100 mUSD       │  │
│ [Setor mUSD] [Cara kerja] │  ┌──┐ ┌──┐ ┌──┐ dealt│  │
│                           └──┴──┴─┴──┴─┴──┴──────┘  │
├─ Cara kerja: 1 Setor  2 Main  3 Klaim (a real sequence)
├─ Pembagian bunga: one stacked bar (fee 15 | dasar 42,5 | bonus 42,5)
├─ Musim berjalan: status + countdown (placeholder until backend)
├─ Yang tidak pernah terjadi: 3 plain guarantees
└─ footer
```

## Motion

- **One orchestrated moment:** the hero sequence on page load (~2.4 s):
  1. The bilyet settles in.
  2. Three cards are dealt from the deck onto it.
  3. Each card flips to show its direction.
  4. The lone-contrarian card gets its ×1,5 badge.
  5. The yield line counts up.
- No entrance animations on the other sections, and no hover effects on non-interactive cards.
- Interactive feedback is welcome: buttons press, and the "Main ulang" control re-deals the hero cards.
- `prefers-reduced-motion`: the final state renders immediately.
- Library: `motion` (`motion/react`). GSAP only if a scroll-scrubbed timeline is ever needed.

## Copy

- Indonesian, plain, second person ("kamu"), sentence case, active verbs.
- The CTA keeps the same name through the flow: "Setor mUSD" → the deposit page → "Setoran berhasil".
- No arrows appended to buttons. No "A · B · C" meta strings. The "Testnet · simulasi" banner text is required by the spec and is the only exception.

## Review against the defaults

These choices were checked against the skill's list of generated-page tells:
- The background is a cool security-paper green, not cream (#F4F1EA), and not near-black with an acid accent.
- The hero is a subject object (bilyet + cards), not a big number with a gradient.
- No uniform card kit: the radius differs by object, and there are no grey shadows.
- The violet appears as fine guilloche line work, never as a gradient wash.
- Numbering appears only in "Cara kerja", which is a real 3-step sequence.
