# Decisions

Ambiguous design calls and known limitations, newest first. Each entry picks the simplest safe option. The full design rationale lives in `openspec/changes/build-crypto-draft-mvp/design.md`.

## 2026-10-23 — Deposit screen (UI only)

- **Screen order follows the flow:** wallet balance and faucet sit in the header (you need mUSD first), then one board with two numbered steps (pick a season, choose an amount) and the single gold "Lock deposit" button. The principal promise sits beside it. The tenor boards are the focal choice; they are native radios, so arrow keys move between them.
- **Focus on a selected tenor board** uses a 6 px outline offset, so the focus ring stands apart from the gold "selected" ring instead of merging into one band.
- **`has-position` means a live season** (enrollment closed, games counting): the position card becomes the main board with "Play a game", and the form is replaced by a note that one position is allowed at a time. A position still enrolling (`other-tenor-active`) keeps the form: picking its own tenor turns the button into "Add to deposit", picking the other tenor explains why it is blocked and links to `#position`.
- **The bonus weight preview** shows min(principal, 1,000 mUSD) for whatever valid number is typed, even while an inline error shows, and adds any amount already locked in that season.
- **Estimated earnings during enrollment** show 0 base yield and 0 bonus ("starts with the season"), since previewClaim has nothing to report before activation. Live estimates are labelled "Estimate, simulated".
- **Dummy clock:** mocks use unix seconds relative to a fixed `MOCK_NOW`; countdowns then tick locally. When an enrollment countdown reaches zero on the page, that tenor flips to "Enrollment closed", so `default` changes after about 2 minutes. Reload to reset.
- **The faucet button stays visible but disabled during the cooldown,** with the time left under it (frontend-vault-ui spec).
- **Kit fixes made here:** the dev-state hooks are now defined in the `"use client"` module `src/lib/use-dev-state.ts` and re-exported from `src/lib/dev-state.ts` (same names and signatures), because a server component importing `dev-state.ts` failed the build (`useSearchParams` in a server module). `AmountInput`'s inner input now uses `focus-visible:outline-none!`: the global unlayered `:focus-visible` rule beat the layered utility and drew a second ring inside the field.
- **One gold primary on /deposit:** the nav's "Deposit mUSD" CTA renders as `night` with `aria-current="page"` there (desktop bar and phone menu). It is still gold in the nav's Suspense fallback, which has no pathname.
- **The chest is on screen before the deposit:** an open chest sits beside the amount step with the typed amount as a gold chip above it (static, no idle motion). On success, the same chip drops into the chest. That is still the screen's one orchestrated moment, and it is skipped under reduced motion.
- **Pending is busy, not invalid:** the gold button keeps full strength with `aria-disabled` + `aria-busy` (clicks are ignored), and the faucet claim is blocked until the deposit resolves.
- **Closed seasons look closed:** a tenor board whose enrollment closed uses `bg-dasar`, a dimmed label, no hover and no gold ring. The blocking notes sit directly under the season boards.
- **Bonus pots are labelled as part simulated:** "Includes X from sponsors. The rest is simulated yield."

## 2026-10-23 — Claim screen and live season card

- **Claim dummy data is computed, not typed.** `src/mocks/claim.ts` runs the vault's finalize split (15% fee, 50/50, sponsor funds added to the bonus pot) and the claim formulas with truncating bigint math, so the breakdown always adds up: total = principal + base yield + bonus. The shortfall mock uses the same code path (CLAUDE.md correction 3): principal pro-rata, base yield 0, bonus from sponsor funds only.
- **Bonus share = bonus ÷ bonus pot**, shown in bps as "1.68%". It is the same number as weighted points ÷ total weighted points, without exposing a second snapshot field. A share has no sign, so the claim components use their own `formatShare` instead of `formatBps` (which is for returns).
- **The total shows truncated to 2 decimals, with the exact 6-decimal amount underneath** ("Exactly 287.153033 mUSD"), so the focal number stays readable and nothing is hidden.
- **One orchestrated moment:** after pressing Claim (1.4 s dummy pending), the closed chest becomes the open treasure chest and the total counts up from the principal to the total. The count is bigint math on a 0–1000 progress, ending exactly on the total. A direct load of `?state=claimed` and reduced motion show the final state at once. After a claim, a one-line summary replaces the breakdown (spec: "the breakdown is replaced by a confirmation").
- **Principal uses the crystal mark** (`NetworkIcon`) as its row marker, since principal is the Principal Crystal. Base yield and bonus use the landing loot bar's `langit` and `emas` swatches, and the player's own loot bar (base | bonus) follows the landing bar's recipe.
- **`wrong-network` on /claim** renders the ready screen under the shell's overlay.
- **Landing dev states:** `visitor` (default) and `has-position`. The page stays static, so a new kit component `DevStateSwitch` picks between server-built views on the client under `<Suspense>`, with the default view as the prerendered fallback. `has-position` also switches the season card to `CURRENT_SEASONS_WEEK_STARTED`, matching the position mock's live 1-week season.
- **Only the bottom CTA is position-aware** ("Deposit mUSD" or "Play", plus a line from the position mock). The hero's "Play now" lives in `TitleScreen`, which the brief keeps unchanged; it should follow the same rule once wallet data is real.
- **Season card countdown without hydration mismatches:** no render reads `Date.now()`. Server and client both start from the given clock (`MOCK_NOW`), and after mount the card adds its own elapsed-seconds counter, so the first client render matches the HTML. Status flips Enrolling → Live → Matured as the clock passes `start` and `end`. The real server clock replaces `MOCK_NOW` later.
- **The season card dropped the static stat grid.** Season length now shows on each tenor tile, and enrollment, counted games and the weight cap became one quiet line under the intro copy.
- **Components import mock types only** (`import type` from `src/mocks/`), because those files define the API shapes. Data still reaches components only through props.

## 2026-10-23 — Shared shell and UI kit

- **One nav for every page.** Links: How to play (opens the tutorial popup), Play, Leaderboard; then a dummy Connect button and the gold "Deposit mUSD" CTA, which is the Deposit entry. The landing's old in-page links (Yield, Season) are gone, so the landing nav differs in its links and the added Connect button; banner, footer and all section geometry are unchanged (measured before and after at 1280 px).
- **The landing opts into the floating nav** by passing `<Nav floating />` into `TitleScreen`; the layout's `SiteNav` skips `/` (`FLOATING_NAV_ROUTES`). Only the floating variant keeps the translucent fill and `backdrop-blur`. Every other page gets the solid navy nav board with the 6 px hard shadow. `SiteNav` reads the pathname under `<Suspense>` with the same nav as fallback, because `usePathname` suspends on unknown dynamic params with `cacheComponents`.
- **Phones get a menu board** (portalled, same board recipe) with the links and the Deposit CTA; Connect stays in the bar. How to play opened from the menu stacks above it, and Escape closes the top dialog first.
- **The dummy wallet lives in a layout context** (`useDummyWallet`), so "connected" survives client navigation and pages can read it.
- **Error color:** inline errors and the error toast use `turun` (coral). It was otherwise reserved for Sell and negative returns; a failure is the one other "negative" state, and coral passes AA on navy. Success uses `zamrud`, info uses `langit`, both only on the toast's edge bar.
- **Urgent timers flip to a gold pill** (ink on gold) instead of turning red, so red stays tied to Sell and errors.
- **Skeletons are static** (no pulse), since idle loops are banned.
- **Money formatting truncates** fractions (never rounds up), default 2 decimals, trailing zeros dropped: a player is never shown more than they have.
- **Dev states:** `?state=` is honored in every build, so a production preview can still show states; the `DevStateBar` and `/ui` exist only in development. `?state=wrong-network` is a shell-level state that works on any page.

## 2026-10-23 — No champions section; skills not tied to characters

- **The "Meet the champions" landing section was removed.** The 3 bots are neutral "house bots" (`frontend/src/lib/bots.ts`). They have no signature skills or Buy/Sell bias. Their portraits appear only in the tutorial seat row: per user feedback, no characters stand on the 3D podiums, which show only their glowing tops and rings.
- **Skills belong to no character.** The skill-hand rule is unchanged: 1 random skill at start, +1 per round won, hand max 3, max 1 skill per round. Bots follow the same rules.

## 2026-10-23 — Landing wave 2 (champions and new-rules copy)

- **Podium seats:** gold front-right is the challenger (player), green is Bruno, coral is Dex, and blue is Bera.
- **Champion sprites** are cylindrical (Y-axis) billboards, so their feet stay planted. Their idle is a squash-and-stretch breath anchored at the feet. They use alpha test 0.5 with premultiplied blending, so they write depth and get the toon outline with no halo.
- **Calls are named Buy/Sell** everywhere. The old copy said Up/Down.
- **Demo season stats follow the season-vault spec:** 15 or 30 minute seasons, a 2 minute enrollment, the first 2 games count, and max weight 1,000 mUSD. "Min. deposit 10 mUSD" was removed from the landing stats. *Correction: the specs do define a 10 mUSD minimum (`contracts-season-vault`, `frontend-vault-ui`), so the deposit screen enforces it; the landing simply doesn't list it.*
- **Reduced-motion hydration fix:** `initial` is always the hidden state, and reduced motion uses a zero-duration transition.

## 2026-10-23 — Logo and palette from the crest

Agreed with the project owner. The official logo is the "adventure crest": a navy shield with a gold bevel, an ivory "J", emerald gems, and the "Jitu.fi" wordmark.
- **The palette follows the logo:** ink `#040B10`, navy `#113048`, ivory `#F2EDE1` for wordmark and headings, gold `#DAAE4B` with bevel `#A17728`, and emerald `#40D0A3` as the brand accent.
- **Monad purple `#836EF9` is kept only for the Monad crystal**, since that is the chain's identity.
- **Buy green moves away from emerald**, so a brand accent never reads as a Buy signal.
- **Landing layout stays as it is.** The logo replaces the text logo in the nav and the hero wordmark, and the shield "J" becomes the favicon and app icon.
- **A 3D version of the crest plays in the loading/intro moment** (the fly-in); after that the hero uses the 2D logo.

- **The hero uses the logo wordmark, not the full lockup,** so the arena stays visible and the crest isn't doubled next to the nav crest. The 3D crest intro is skipped under reduced motion, without WebGL, or when the 3D chunk takes longer than 1.8 s, and it never delays the CTAs.
- **Buy green is `#7BE35A`.** Extra tokens: papan `#18405E`, papan-terang `#225378`, dasar `#0A2235`, langit `#2E6A8E`, gading (ivory), zamrud (emerald), emas-tua (gold bevel). The scene's sky, fog and peaks moved from indigo to navy.
- **Champion sprites render after the crystal glow** (renderOrder 3, no fog), so all four are equally readable.

## 2026-10-23 — Landing hero 3D details

- **Toon outline** is a custom screen-space depth-Laplacian post effect, not drei `Outlines`. It roughly halves draw calls and keeps a constant line width. Glow meshes write no depth, so they get no outline.
- **Coins don't orbit a full 360°.** Any closed loop has to pass in front of the crystal, so coins sway ±8° on a back/side arc that adapts to the aspect ratio.
- **The crystal sways about ±23°** instead of spinning, so the Monad mark never turns edge-on. The small orbiting mark shards were removed because edge-on they read as white slivers.

## 2026-10-23 — Visual direction: arena world + coin spirits

Agreed with the project owner after a brainstorm.
- **Landing:** the 3D "Arena Jitu" world from `frontend/DESIGN.md` stays. The 3 house bots become named rival characters (house champions) on the podiums; the player challenges them.
- **Game table: coin spirits.** Each drafted coin is summoned as a spirit onto the player's podium. During Live, a spirit floats up or sinks with the real price (height = return), and a small "ridge" chart behind it renders the price line as a mountain ridge the spirit walks on. Skills are visible spells: FREEZE ices the spirit, FLIP spins it upside down, SWAP trades podiums, INSURANCE is a light shield under it, BOOST enlarges it. Landing and game share one world.
- **No casino cues:** no green felt, chips, dice, roulette or slot imagery.
- Rejected: a Balatro-style card draft (too common a theme), a tactics grid (positions don't matter in this game), and a cozy garden (weak fit with competitive play; would discard the 3D arena).

## 2026-10-23 — Game and tokenomics redesign

Agreed with the project owner. It replaces the build spec's game rules: contrarian multiplier, 4/3/2/1 rank points, ×1/×1.5/×2 round multipliers, fixed 3 picks, and the GIFT_COIN/SHIELD skills.

### Game
- **Presets instead of free choice:** Quick 3, Standard 5, Long 7, Marathon 10 rounds. Free choice of rounds and duration would split the matchmaking queue.
- **Growing pick caps per round:** 1·2·3 / 1·1·2·2·3 / 1·1·2·2·3·3·4 / 1·1·2·2·3·3·4·4·5·5. Later rounds are worth more because cap multiplies the score.
- **Phases:** commit 20 s, reveal 10 s, live a random 60–120 s. The live duration is drawn at round start and shown before players pick, so it adds variety without adding luck.
- **Scoring:** round score = cap × weighted average return (bps) of the player's non-void picks. This is the owner's "fewer picks = more confidence" rule, (correct ÷ picked) × cap, generalised to return magnitude. In expectation it is not a free bonus: a random guesser scores the same whatever they pick. It rewards selectivity: a skilled player picks only the calls they trust.
- **Void:** a pick that moves less than 1 bps counts as neither right nor wrong.
- **Game score:** Σ round scores ÷ Σ caps, so long presets don't automatically earn more.
- **Season points:** max(0, game score) summed over each player's **first K games** (K = 5, demo 2). Best-K was rejected because it lets players farm luck (many 1-pick games, keep the lucky ones). Unlimited games was rejected because it rewards grinding.
- **Forfeit:** a player who does not commit and reveal scores 0 for the round and cannot win it.
- **Settle starts the next round** in the same transaction, saving one keeper transaction per round.

### Skills
- **Six skills:** BOOST (pick weight ×2) and INSURANCE (pick floored at 0) are chosen at commit and hidden in the hash. LOCK, FLIP, SWAP and FREEZE are used in Live.
- **Limits:** at most 1 skill per player per round, hand max 3, 1 random skill at the start, plus 1 for each round won.
- **Interactions:** a pick carries at most one live effect. INSURANCE applies last. A player can be frozen at most once per round.
- **No price cherry-picking:** live skills need a price no older than 5 s, supplied by the backend (not the client). They are blocked after the live deadline even while the round is still waiting to settle.

### Table and bots
- **Tables seat 4; for now 1 human + 3 house bots.** A multi-human queue is designed but disabled behind a flag.
- **Bots don't touch the bonus pot.** They need no deposit, skip eligibility, and never earn season points. They play through the relayer, so only the relayer key needs MON.
- **One unfinished table per human,** so a player cannot run parallel games.

### Tokenomics
- **A lock tenor is a season** (1 week, 1 month; in demo 15 and 30 min). Each season splits its own pot.
- **One active position per address** (`activeSeasonOf`), so a player's points belong to exactly one season.
- **Everything is paid at maturity:** principal, base yield and bonus. The bonus depends on everyone's final points, so it cannot be paid earlier. The UI shows live estimated earnings.
- **Losing streak:** the player still gets principal + base yield (about 42.5% of the yield their deposit produced). They never lose money; they only miss the bonus share.
- **Sponsor pot:** `fundBonus(seasonId, amount)` lets anyone seed a season's bonus pot. The demo deploy and keeper use it so the prize looks meaningful. Sponsor funds bypass the fee and survive a shortfall.
- **Demo APR:** 17,520,000 bps, about 10% per 30 minutes. The build spec's 500,000 bps gave only ~0.29% per 30 minutes, which was invisible in a demo. Labelled "simulated" in the UI.
- **No gasless faucet or claim:** it's a hackathon and players hold testnet MON. Deposit, faucet and claim are normal wallet transactions. Only in-game actions are relayed.
- **No sequential EIP-712 nonces.** Replay is blocked by contract state (one commit and one skill per round) plus a deadline. A failed commit can no longer invalidate a later signature. Reveal needs no signature, since the commit hash binds the player.

## Known limitations

- **PseudoRandomness is predictable.** Coin draws, live durations and skill deals derive from the previous blockhash, so they can be computed in advance. Accepted for the demo; the fix is Pyth Entropy behind `IRandomness`. (CLAUDE.md correction 4; GIFT_COIN, which it originally named, has since been removed.)
- **Short-window direction is close to random.** Void picks, magnitude scoring, confidence through fewer picks and the K-game average reduce luck, but a single game is still noisy.
- **Sybil splitting.** One person can split a deposit across wallets to multiply the 1,000 mUSD weight cap. Not mitigated in the MVP.
- **Trusted keeper timing.** The keeper chooses the exact settle moment within the oracle's max age. Possible hardening: `parsePriceFeedUpdates` with a publishTime window at the deadline.
- **Lost local storage before Reveal means forfeit.** The salt lives only in the browser; the UI warns the player.

## Corrections carried from CLAUDE.md

1. **Late points:** GameManager credits no points when `block.timestamp >= season end` or the season is Finalized, and emits `PointsSkipped`. The matchmaker refuses tables that cannot finish in time. An invariant test covers it.
2. **Skill hands are scoped per table.**
3. **Shortfall:** if the strategy returns less than principal, fee and base yield are 0, principal is repaid pro-rata, and only sponsor funds remain in the bonus pot. `Shortfall` is emitted.
4. **PseudoRandomness predictability** (see Known limitations).
