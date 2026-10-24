# Decisions

Ambiguous design calls and known limitations, newest first. Each entry picks the simplest safe option. The full design rationale lives in `openspec/changes/build-crypto-draft-mvp/design.md`.

## 2026-10-24 — Arena is the game table; fixed viewport

- Per Jeki's follow-up, animated coins now reuse the actual three.js `world/Coin` model from the landing. A single transparent WebGL layer follows the table, hand, flip and travel anchors; CSS faces are a capability fallback only. The stone table remains 2D. Live centers the player's sealed picks with a focused 3D coin, Buy/Sell, matching simulated quote/return and a price path; tabs expose every selected pick.
- After pulling the shared shell from main, `/play` uses its banner/nav/footer. The fixed in-game view keeps its compact HUD and hides the shared chrome through explicit DOM markers, preventing duplicate navigation and background page scrolling. The shared wallet and wrong-network gate remain available.
- Coin motion now uses CSS 3D front/reverse faces and a layered rim on the 2D table. Reveal flips from the crest to the asset, with per-seat staggering and a glint. Deal/return travel uses sampled curves with eased endpoints and 3D tilt. Concealed hands omit front assets entirely; reduced motion skips flips and travel.
- Hand visuals are frameless per design feedback: concealed picks show only the Jitu crest, without a question mark; revealed picks show the coin icon, symbol and colored Buy/Sell text. The travelling duplicate uses the same frameless treatment.
- Picks now sit in hands beside avatars. Local human picks show their symbol and Buy/Sell; opponents show only backs and a count until Reveal, when symbols and directions open. Jeki explicitly confirmed Reveal as the disclosure boundary. Confirmation duplicates the central coin and deals the copy into the local hand; copies return to the center between rounds. Reduced motion skips travel effects.
- Latest visual direction from Jeki: use an illustrated 2D stone arena for all in-game screen sizes. The playable table uses SVG/CSS, while the landing and lobby retain their existing 3D previews. Coin-chart dialogs, Buy/Sell confirmation and the fixed viewport remain part of the game UI. This supersedes the desktop 3D table direction below.
- Per Jeki's clarification and seating-layout reference, the stone arena is the playable table. Eight selectable coins are anchored to its surface, four player panels attach to its rim, and the challenger occupies the near seat. The Principal Crystal remains protected at the center.
- In-game stays within one fixed viewport, without page scrolling. The header, table and compact action dock share the screen; reveal, round results and final ranks reuse the same seats. Mobile seat details and round history open in place.
- Per the subsequent UX request, enlarge the table and tokens. Clicking a coin opens a chart dialog; Buy/Sell confirms the pick and returns to the table. Closing without confirmation leaves picks unchanged. The chart stays readable after Commit, with actions disabled; its simulated quotes share the table's clock and Live scoring path.
- Desktop uses the existing arena geometry with a table camera; smaller screens, reduced motion and unavailable WebGL use an interactive 2D table. Local pick tokens provide reveal/return feedback without editing the shared world or Mario's component folders.

## 2026-10-24 — UI-first game flow, arena continuity

- Jeki's `/play` and `/table/demo-<preset>` screens implement FE_PLAN items 9–16 using local deterministic fixtures. No wallet, backend or contract integration is implied. Reloading resets the demo.
- Game screens reuse the existing floating stone arena and Principal Crystal, with podium signals responding to selection, lock, reveal and round winners. Preset cards use cut-stone silhouettes. Existing world components stay unchanged; Mario's coin spirits, live skill effects and charts remain separate work.
- The initial demo hand has one BOOST; round wins award deterministic BOOST/INSURANCE cards, capped at three. Only held skills may be applied, at most one per round. These fixtures stand in for the eventual full six-skill hand.
- Scores use cap × weighted average non-void signed returns in bps, with BOOST weight two and INSURANCE applied as a zero floor. Round and game scores truncate toward zero. Game scores normalize by total preset caps; negative scores credit zero season points. Preview controls cover ties, forfeits, void moves, used counted games and season cutoff.
- Game-only navigation and explicit prefixed CSS stay in `components/table/` until the shared shell and UI kit are ready. This avoids changing teammates' files or the shared Tailwind/Turbopack loader, which currently drops CSS module exports.

## 2026-10-24 — Skill hand, pickers and spells (UI only)

- **The hand owns only the pick-and-confirm flow.** `<SkillHand>` takes the cards, phase, live-deadline and used-this-round flags, your picks, the rivals' picks and the board coins, and calls `onUse(card, target)`. A returned promise keeps the confirm button pending; resolve shows the success line, reject shows the error. The page removes the card and sets `usedThisRound`.
- **Disabled reasons, first match wins:** already used a skill this round → wrong phase ("Only at commit" for BOOST/INSURANCE, "Opens in Live" before Live, "Live is over" in result) → "Live deadline passed" → no valid target. Single targets show "Has FREEZE" or "Bera is already frozen" (a player is frozen at most once per round). SWAP offers only board coins you didn't pick this round.
- **BOOST and INSURANCE sit in the same hand** and are added at commit through the same picker (button "Add BOOST"), because they come from the same deal and count as the round's one skill.
- **Spells play once, then hold a still mark,** so there is no idle UI loop: ice stays on a frozen pick, a flipped coin stays upside down, a boosted one stays larger. Frozen and locked spirits stop bobbing in 3D, since their return is held. Reduced motion shows the end state at once.
- **The 3D spells are `renderEffect`'s default** and load inside the scene's 3D chunk, so a page never imports three.js just for skills. The 2D table draws the same spells on its coins. Spirits are keyed by slot, so a SWAP plays its trade instead of popping a new spirit in. `ScenePick` gained `effectBy` (who cast it on you) and `swappedFrom`.
- **Skill-fx sprites are opt-in by name** (`components/skills/fx.ts`); each effect keeps a procedural stand-in for a missing or failed file. The wisp is used for BOOST sparks only for now.
- **Incoming FREEZE** is a toast ("Bera froze your MON", with the held return) plus the ice landing on your spirit; `/dev/skills?state=incoming-freeze` stages it 1.8 s into Live.

## 2026-10-24 — Leaderboard and profile (UI only)

- **Only players with season points are ranked.** A depositor with 0 points has nothing to rank and no bonus share, so the board leaves them out; `you-not-ranked` shows a "not on the board yet" tile with Play. On the other tenor's board, the same tile explains that your deposit is in the other season (one position at a time).
- **Estimated bonus is computed in the mock** as bonusPot × points × weight ÷ Σ(points × weight) with truncating bigint math, so the column never adds up to more than the pot. It is labelled an estimate, simulated.
- **Mobile leaderboard is stacked tiles below md** (a table from md up), so 375 px never scrolls sideways. The tiles drop the mUSD unit and a one-line legend names it.
- **Medals and empty-state art come from `public/assets/stats/` only if the file exists** (checked with sync `fs` at prerender, `components/stats/art.ts`). Until then ranks 1–3 use a numbered circle in gold, ivory and bronze, and empty states reuse `play-cards.webp`.
- **Profile history is grouped by season**, newest first. The summary covers the season your position is in; "Best game score" is the best in that season. Game and round scores show as signed integers (bps of game score, the same unit as season points); pick returns use `formatBps`. Dates print in UTC so server and client render the same text.
- **Points line per game:** counted games show "+N points, game n of K" (a negative counted score adds 0 and says so); other games say "Outside first K games" or "After season end". INSURANCE shows the original return struck through and the floored 0%.

## 2026-10-24 — Table scene prototype (coin spirits)

- **`<TableScene>` takes props only** (`frontend/src/components/table-scene/types.ts`). A pick's `returnBps` is the raw coin move, and the scene applies Buy/Sell itself. Effects plug in through a `renderEffect` slot.
- **Players are seated by podium colour.** The ridge behind each spirit draws the literal price line, not one adjusted for side.
- **In the table scene the Monad crystal is scaled to 0.55 and the camera pitched about 38°,** so the front spirits clear the back podiums. Changes to `world/` are additive only (Coin `dim` prop, exported `PODIUM_TOP_Y`), so the landing hero is unchanged.
- **Dev preview routes** live under `frontend/src/app/dev/` (`/dev/table-scene`, `/dev/chart`) and return 404 in production.

## 2026-10-24 — Plain pick submission; scoring lib ownership

Decided by the project owner in the backend session.

- **Picks are a plain submit.** During Commit, players POST their picks (and BOOST/INSURANCE choice) to the backend, which keeps them hidden from the other seats until Reveal. No commit hash and no salt. This replaces the commit-hash and salt rules in the 2026-10-23 redesign, design.md D9/D10/D15 and the game-table spec. The "lost local storage before Reveal means forfeit" limitation no longer applies; a player who submits nothing during Commit still forfeits the round.
- **Hiding picks is a backend promise,** like scoring (see Known limitations: the backend is trusted).
- **Scoring lib:** the backend session writes `packages/shared/src/scoring.ts` and `packages/shared/test-vectors/*`. The rest of `packages/shared` (scaffold, ABI exports, deployments) belongs to the contracts session.

## 2026-10-24 — Contract details

- **Strategy accounts are keyed by season id.** `IYieldStrategy` takes a season id on `deposit`, `withdrawAll` and `totalAssets`. With one shared account, finalizing the 1-week season would have withdrawn the 1-month season's principal too.
- **`sweepDust` only after every depositor has claimed.** The spec's "or 30 days after finalize" branch is dropped: sweeping while claims are open could pay one season's dust out of another season's funds.
- **`finalize` activates a season nobody activated,** so a season can always reach Finalized and claims never get stuck.
- **`depositWithPermit` tolerates a failed permit** (for example a front-run one) and falls back to the existing allowance.
- **The keeper holds `MINTER_ROLE` on mUSD** to seed bonus pots of renewed demo seasons. mUSD is a testnet mock with no value.
- **Foundry 1.5.1.** CLAUDE.md asks for ≥ 1.8.0, but `foundryup` offers 1.5.1 as the current stable, and every test passes on it. OpenZeppelin v5.4.0 and forge-std are vendored in `contracts/lib` (sources only), so a fresh clone builds without submodules.

## 2026-10-24 — Game runs in the backend; one on-chain tx per game

Agreed with the project owner on Blitz day, with about 6 hours to the submission freeze. It replaces the on-chain table, commit-reveal, oracle and skill design.

- **The game engine moves to the backend.** Tables, picks, the commit → reveal → live → settle phases, prices, skills and scoring all run in the backend, using the shared TS scoring library. The game rules themselves (presets, caps, scoring, void, the six skills) are unchanged.
- **One transaction per finished game.** The keeper (`RESULT_POSTER_ROLE`) calls `GameManager.recordGame` once for the human seat with the game score and a hash of the full game log. Bots are never recorded.
- **The contract still guards the money rules:** points = max(0, game score), only the first K games per season count, no points at or after season end or once Finalized (`PointsSkipped`), each game id is recorded once, and `seasonTotalWeighted` is kept for the vault. A game score above `MAX_GAME_SCORE` (10,000 bps) reverts, which limits what a leaked keeper key can do.
- **Prices come from Pyth Hermes off-chain.** No on-chain oracle, coin registry or randomness contract. The Pyth contract address question goes away.
- **No wallet popups during play.** Players send picks and skills to the backend over the API, authenticated with SIWE. Deposit, faucet and claim stay wallet transactions. EIP-712 meta-transactions are dropped.
- **Correction 2 (per-table skill hands) now applies to the backend engine.** Corrections 1 and 3 stay on-chain.
- **Rejected:** posting every round on-chain (more transparent, more keeper txs and build time) and the full on-chain engine (too slow to build safely today).
- See Known limitations: the backend is trusted to score games honestly.

## 2026-10-24 — FLIP and SWAP become traps on opponents

Agreed with the project owner. FLIP and SWAP were self-help skills; they now target an opponent's pick, like FREEZE. This replaces the FLIP and SWAP rules in the 2026-10-23 redesign below.

- **FLIP:** reverses an opponent's pick from now on (Buy becomes Sell, Sell becomes Buy). The pick's return is start → flip price in the old direction plus flip price → end in the new direction, each segment truncated separately.
- **SWAP:** moves an opponent's pick onto another table coin the opponent didn't pick this round. The attacker chooses the coin; the victim keeps their direction. The return is the old coin start → now plus the new coin now → end. Letting the attacker also choose the direction was rejected because it makes SWAP a guaranteed hit.
- **Skill roles:** BOOST, INSURANCE and LOCK help yourself; FREEZE, FLIP and SWAP attack an opponent.
- **One attack per target per round:** a player can be hit by at most one of FREEZE, FLIP and SWAP in a round. This generalises the old "frozen at most once" rule, so 3 opponents can't pile onto one player.
- **Counterplay:** a pick still carries at most one live effect, so locking a pick first makes it immune to attacks. INSURANCE still applies last, so an insured pick can't go below 0 after a FLIP or SWAP.
- **Bots attack too.** House bots play by the same rules, so a bot's FLIP or SWAP can lower a human's game score and season points. Accepted, since it's the same for every human. Recorded under Known limitations.

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
- **Interactions:** a pick carries at most one live effect. INSURANCE applies last. A player can be frozen at most once per round. (FLIP and SWAP were changed to opponent attacks on 2026-10-24, see above.)
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
- **The backend is trusted to score games.** Since 2026-10-24 the game runs off-chain and only the final score reaches the chain, so players can't prove their score on-chain. Mitigations: the contract caps a game score at `MAX_GAME_SCORE`, enforces first-K and the season cutoff, and stores a hash of the full game log that the backend serves for audit. Fix later: move commit-reveal and skills back on-chain, or post every round.
- **House bots can hurt a human's points.** Bots may FREEZE, FLIP or SWAP a human's pick, which changes that human's game score and season points. It applies equally to every human, but it adds noise that doesn't come from the human's own calls.
- **Sybil splitting.** One person can split a deposit across wallets to multiply the 1,000 mUSD weight cap. Not mitigated in the MVP.
- **Trusted keeper timing.** The keeper chooses the exact settle moment within the oracle's max age. Possible hardening: `parsePriceFeedUpdates` with a publishTime window at the deadline.
- ~~**Lost local storage before Reveal means forfeit.**~~ Obsolete since 2026-10-24: picks are a plain submit with no salt.

## Corrections carried from CLAUDE.md

1. **Late points:** GameManager credits no points when `block.timestamp >= season end` or the season is Finalized, and emits `PointsSkipped`. The matchmaker refuses tables that cannot finish in time. An invariant test covers it.
2. **Skill hands are scoped per table.**
3. **Shortfall:** if the strategy returns less than principal, fee and base yield are 0, principal is repaid pro-rata, and only sponsor funds remain in the bonus pot. `Shortfall` is emitted.
4. **PseudoRandomness predictability** (see Known limitations).
