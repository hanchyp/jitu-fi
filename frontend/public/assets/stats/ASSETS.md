# Stats illustrations — batch X4

Generated with the built-in image generation tool after visually inspecting the existing skills and landing art. No application code changed. All exports use `cwebp -q 82`, preserve generated alpha, and use decimal KB (1 KB = 1,000 bytes). Source PNGs remain outside the repository.

## Shared prompt

Use case: stylized-concept. Production jitu.fi illustrated game sprite. Match the game art inspected in this conversation: premium hand-painted toon/cel shading, chunky rounded forms, thick crisp ink #040B10 outlines, bold simple silhouette, polished bevels, warm upper-left light, navy #113048 shadows. Palette: gold #DAAE4B with bevel shadows #A17728, ivory #F2EDE1 highlights, emerald #40D0A3 effects, purple #836EF9 at most a tiny accent. NO text, letters, numbers, watermark, real logos, coins, characters, casino cues, playing cards, card suits, chips, dice, religious symbols. Genuinely transparent background and generous transparent padding.

Each generation prompt is the shared prompt followed by the asset prompt below. Silver and bronze medals use their specified metal colors; the spirit wisp deliberately omits a hard ink contour for additive blending.

| File | px | KB | Purpose | Prompt |
|---|---:|---:|---|---|
| `medal-1.webp` | 256 × 256 | 14.11 | Gold first-rank medal | Gold first-rank medal with two short navy/emerald ribbon tails. A chunky polished GOLD crest-shaped medal (angular shield medallion, NOT a coin) with beveled gold rim, ivory glints, small faceted emerald diamond gem centered. Rich gold body, compact grand silhouette. Straight-on front view, square centered 10% transparent padding. NO number, lettering, crown, real logo or religious symbol. |
| `medal-2.webp` | 256 × 256 | 11.93 | Silver second-rank medal | Silver second-rank medal with two short navy/emerald ribbon tails. A chunky polished SILVER crest-shaped medal (angular shield medallion, NOT a coin) with beveled cool silver rim, ivory glints, small faceted emerald diamond gem centered. Silver body shaded navy, compact silhouette. Same family as gold rank medal. Straight-on front view, square centered 10% transparent padding. NO number, lettering, crown, real logo or religious symbol. |
| `medal-3.webp` | 256 × 256 | 11.08 | Bronze third-rank medal | Bronze third-rank medal with two short navy/emerald ribbon tails. A chunky polished BRONZE crest-shaped medal (angular shield medallion, NOT a coin) with beveled copper-bronze rim, warm ivory glints, small faceted emerald diamond gem centered. Warm bronze body shaded deep brown/navy, compact silhouette. Same family as gold and silver rank medals. Straight-on front view, square centered 10% transparent padding. NO number, lettering, crown, real logo or religious symbol. |
| `empty-leaderboard.webp` | 640 × 480 | 44.14 | Empty leaderboard arena | Landscape 4:3 empty-state illustration: an EMPTY small circular stone arena with three empty low winners podium blocks waiting for players, center block slightly taller, navy stone with ivory top-left highlights, gold trims and tiny emerald inset gems. Behind podium a small isolated scalloped navy night-sky vignette with a few tiny stars; the sky is a contained cutout shape, NOT a rectangular background. Exterior transparent all around, 10% padding. Quiet inviting composition matching inspected landing arena style, no characters, no trophies, no coins, no numbers, no text, no religious architecture. |
| `empty-profile.webp` | 640 × 480 | 40.66 | Empty profile journal | Landscape 4:3 empty-state illustration: an adventurer's CLOSED JOURNAL with a blank navy leather cover, chunky gold corner protectors and emerald gem clasp. Resting beside it one elegant ivory feather quill and one small faceted emerald crystal, a short blank rolled ivory scroll tucked beneath. Three-quarter view, quiet unused journal suggesting nothing played yet. Single compact isolated arrangement with 10% clear transparent padding; no floor, no surrounding scene, no writing or marks, no coins, no characters. Heavy ink contour, polished cel shading, top-left light. |

## Integration and verification

- Public URLs: `/assets/stats/<file>.webp`.
- Medals are 256 × 256; empty states are 640 × 480. All have real alpha and alpha 0 at all four corners.
- Medal ranks are communicated through gold, silver, and bronze materials without embedded numbers. The leaderboard sky is an isolated vignette surrounded by transparency.
- Folder WebP total: 121.92 KB. Both batches combined: 469.51 KB, below 1.2 MB including the two manifests.
- Acceptance build: `pnpm --filter frontend build` passed (production compilation, TypeScript, and all 14 static pages).
- Local contact sheet: `frontend/.screenshots/x4/contact-sheet.png` (not committed).
