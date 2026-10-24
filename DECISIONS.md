# Decisions

Ambiguous design calls and known limitations, newest first. Each entry picks the simplest safe option. The full design rationale lives in `openspec/changes/build-crypto-draft-mvp/design.md`.

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
