# Skill effect sprites — batch X4

Generated with the built-in image generation tool after visually inspecting the existing skills and landing art. No application code changed. All exports use `cwebp -q 82`, preserve generated alpha, and use decimal KB (1 KB = 1,000 bytes). Source PNGs remain outside the repository.

## Shared prompt

Use case: stylized-concept. Production jitu.fi illustrated game sprite. Match the game art inspected in this conversation: premium hand-painted toon/cel shading, chunky rounded forms, thick crisp ink #040B10 outlines, bold simple silhouette, polished bevels, warm upper-left light, navy #113048 shadows. Palette: gold #DAAE4B with bevel shadows #A17728, ivory #F2EDE1 highlights, emerald #40D0A3 effects, purple #836EF9 at most a tiny accent. NO text, letters, numbers, watermark, real logos, coins, characters, casino cues, playing cards, card suits, chips, dice, religious symbols. Genuinely transparent background and generous transparent padding.

Each generation prompt is the shared prompt followed by the asset prompt below. Silver and bronze medals use their specified metal colors; the spirit wisp deliberately omits a hard ink contour for additive blending.

| File | px | KB | Purpose | Prompt |
|---|---:|---:|---|---|
| `freeze-ice.webp` | 512 × 512 | 63.54 | Hollow ice shell around any coin spirit | Jagged faceted ice-crystal shell ring with sparse frost particles. Circular ring seen nearly straight on, pale ivory/emerald ice and navy shadows. Large fully transparent hollow circular center at least 45% canvas width for overlaying a separate coin spirit; NO ice membrane across center. Complete ring and all particles within square canvas with 8% padding. No coin. |
| `insurance-shield.webp` | 512 × 512 | 28.74 | Protective light arc beneath a coin spirit | Glowing ivory/gold light shield arc meant to sit UNDER a separate coin spirit. Wide shallow upward-open U shaped protective shield rim, ivory luminous inlay with gold beveled border, two small emerald glints. Positioned in lower half of square canvas; upper half and above arc entirely transparent for a separate coin. Open arc rather than a filled shield. Three-quarter perspective, full arc with 8% padding. No coin. |
| `lock-seal.webp` | 512 × 512 | 36.85 | Lock effect with blank emerald wax seal | One chunky gold padlock in three-quarter view, heavy rounded shackle and beveled rectangular body with keyhole, a small emerald wax seal on front upper-right corner. Blank smooth seal, no marking. Clear compact silhouette, centered square composition 10% clear padding. Only lock and attached seal, no coin behind it. |
| `flip-swirl.webp` | 512 × 512 | 38.27 | Hollow double-arrow flip effect | Curved DOUBLE-ARROW emerald swirl ring, exactly two thick tapered emerald curved arrows chasing one another around a large fully transparent hollow circular center at least 45% canvas width. Polished ivory highlights, navy shadow and crisp ink contour. Slight three-quarter tilt for a 3D scene, centered square with 10% transparent padding. No object in center, no coin. |
| `swap-portal.webp` | 512 × 512 | 49.60 | Portal and crossing exchange arrows | Small swirling emerald portal ring with exactly TWO clearly readable crossing exchange arrows, one goes from upper-left to lower-right, the other from lower-left to upper-right, opposed arrowheads. Arrows weave in front of and behind thin elliptical portal ring, with tiny purple accent only at ring rim. Simple clear silhouette, center otherwise hollow. Square centered 10% padding. No coins, objects, character or scene. |
| `boost-aura.webp` | 512 × 512 | 88.23 | Hollow upward power-up aura | Emerald power-up aura burst forming an open circular wreath around a large fully transparent hollow center at least 45% canvas width. Three distinct upward-pointing emerald arrows positioned around outer ring, crisp cel-shaded flame-like ribbons with ivory glints, rising energy motes. No filled center, no coin or object. Square centered with 10% clear padding. |
| `spirit-wisp.webp` | 512 × 512 | 42.36 | Soft shared spirit tail; additive-friendly | A soft ivory and emerald spirit wisp TAIL and glow to sit under every floating coin spirit. One flowing tapering S-shaped vapor curl, ivory luminous upper bulb transitioning into emerald lower curling tail, translucent pale emerald tendrils. Additive-friendly, all visible pixels light ivory or emerald, exceptionally soft feathered semi-transparent edges fade fully to alpha zero well before canvas boundary. NO dark outline on vapor (atmospheric exception), no face, no coin, no solid objects or floor, no opaque background. Square, centered airy effect with 15% clear padding. |

## Swap refinement prompt

Edit ONLY the two gold arrows in this transparent game sprite: make their shafts visibly CROSS OVER EACH OTHER at the center in an X crossing, one traveling from upper-left to lower-right with head at lower-right, and the other from lower-left to upper-right with head at upper-right. One passes over the other with clearly readable overlap. Two arrows only, exactly two arrowheads. Preserve the existing emerald portal ring, navy shadows, gold beveled cel shading, top-left lighting, generous padding and genuine alpha transparency. Reduce purple to a single very tiny glint on ring rim. No coin, no face, no text, no religious symbol, no background. Keep overall square composition and polished game art style.

## Integration and verification

- Public URLs: `/assets/skill-fx/<file>.webp`.
- No coin is baked into any effect. Freeze, flip, and boost have fully transparent centers; insurance leaves the center and upper region clear. Swap arrows intentionally cross the center; lock is a separate solid effect.
- All images are 512 × 512, have real alpha, and have alpha 0 at all four canvas corners. Freeze, flip, boost, and insurance also have alpha 0 at (256, 256).
- Wisp alpha ranges from 0 to 254, with softly translucent ivory/emerald vapor and no dark contour. Intended for additive blending with depth writing disabled; other effects can use ordinary alpha blending.
- Folder WebP total: 347.58 KB. Both batches combined: 469.51 KB, below 1.2 MB including the two manifests.
- Acceptance build: `pnpm --filter frontend build` passed (production compilation, TypeScript, and all 14 static pages).
- Local contact sheet: `frontend/.screenshots/x4/contact-sheet.png` (not committed).
