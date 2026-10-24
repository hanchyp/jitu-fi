# Monad Blitz Jogja — notes for jitu.fi

Source: "Monad Blitz Jogja · Hackathon Brief" slides (Monad Foundation + Dev Web3 Jogja), 2026-10-24.
Only the parts that change how we build, deploy or pitch jitu.fi are kept here.

## 1. Deadline and eligibility (read first)

- **Event:** Saturday 2026-10-24, 8:00 AM – 8:00 PM. **Submissions freeze at 4:45 PM.** Pitch order = submission order, so submitting early means pitching early.
- **Contracts must be deployed during the Blitz** (inside today's timeline). Anything deployed before or after doesn't count.
- Submit, claim tokens and vote at **blitz.devnads.com**.
- To be eligible to win, all six are required:
  1. Public GitHub repo.
  2. Proper README: what it does, setup, how to run.
  3. Deployed on Monad (testnet is fine).
  4. Deployed during the Blitz.
  5. Live on the web (a working app, not slides). Any host, no custom domain needed.
  6. **Deployed contract addresses listed in the README.**

## 2. Judging (400 points)

| Block | Item | Pts | jitu.fi action |
|---|---|---|---|
| Basic (100) | Public repo | 25 | Make the repo public before submitting |
| | README with live URL + contract address | 25 | Add a "Deployments" table (contract, address, explorer link) and the live URL |
| | Contracts on Monad testnet | 25 | `Deploy.s.sol` to chain 10143 |
| | Publicly hosted | 25 | Vercel for `frontend/` (backend needs a host too if the game depends on it) |
| Advance: works (100) | All announced features work | 25 | **Only announce what works.** Cut scope rather than demo broken skills |
| | Live on-chain tx during the demo | 25 | Do a real deposit or claim on stage |
| | **Contract verified on the explorer** | 25 | Verify every contract (see §5) |
| | Someone else can run it from the README | 25 | Clean `pnpm install` → `.env.example` → run steps, tested on a fresh clone |
| Advance: build in public (100) | Post on X/LinkedIn tagging @monad @monad_dev @geeky_kartikey | 25 | |
| | Demo video ≥ 30 s, product running | 25 | |
| | Creative ad video | 25 | The 3D arena title screen is good material |
| | 5K+ views across all posts | 25 | |
| Bonus (100) | Contracts on Monad **mainnet** | 25 | **Skip.** CLAUDE.md forbids mainnet (143). We accept losing these 25 points |
| | Custom domain | 15 | Only if `jitu.fi` (or similar) is cheap and quick to point |
| | Product-market fit | ≤ 20 | "Gamified no-loss deposit": principal-safe savings people actually want to open |
| | Revenue potential | ≤ 20 | The 15% fee on yield + sponsor-funded bonus pots |
| | Innovation | ≤ 20 | Skill decides the yield split; no lottery, no buy-in |

What the organisers want: **novel mechanics and exploring Monad's limits**, not perfect UI, long feature lists or polished decks. Slides are not required; 3-minute live demo.

## 3. Monad facts that matter for our design

| | Monad | Ethereum L1 |
|---|---|---|
| Block time | **0.3 s** | 12 s |
| Finality | **0.6 s** (MonadBFT, single round) | ~13 min |
| Throughput | 500M gas/s, ~10,000 TPS | 5M gas/s, ~28 TPS |
| Max contract size | **256 KB** | 24 KB |

- **Fully EVM-compatible.** Same Solidity, compiler, Foundry, viem, JSON-RPC and WebSocket. Existing contracts deploy unchanged.
- Execution is **asynchronous** (consensus doesn't wait for execution) and **optimistically parallel** (conflicting txs are re-run, final result equals serial order). No contract changes needed.
- **What it means for jitu.fi:**
  - Commit 20 s / reveal 10 s / live 60–120 s phases are ~100–400 blocks each, so on-chain phase timing is precise. A keeper settling right at the deadline is realistic.
  - 0.6 s finality makes per-round on-chain commit/reveal/skill actions feel close to real-time, which is our "explore Monad's limits" pitch angle: **a fully on-chain real-time game with every pick and skill as a tx.**
  - 256 KB size limit: `GameManager` with scoring and six skills fits without proxies or library splitting. Task 2.12 still checks size; the spec's 128 KB target is stricter than the chain needs.
  - Many players hitting the same `GameManager` storage (one table's state) can conflict in parallel execution. That is correct, just not "free" parallelism. Per-table storage keeps tables independent.

## 4. Monad-specific developer features

- **`eth_sendRawTransactionSync`** — returns the full receipt synchronously. Use it in the backend `sendTx` helper (relayer, keeper) so a relayed commit or skill gets its receipt in one call. Lets the UI confirm in-game actions instantly.
- **Execution events** — stream events straight from a node, skipping the indexer round-trip. Interesting but needs our own node. **Not for the MVP**; the WS-logs indexer is enough.
- **MIP-8 (upcoming)** — cheaper cold storage slot access. Nothing to do now.
- **viem ≥ 2.40** has native `monadTestnet` / `monad` chains. Use the built-in chain instead of hand-writing chain config.
- **Monad Foundry** — a Foundry fork with Monad precompiles, accurate trace decoding and gas during simulation. Useful because Monad bills the **gas limit**: more accurate estimates mean less overpaying with our ×1.15 buffer.
- **x402 / MPP / ERC-8004 / React Native templates** — agentic payments, agent identity, mobile. Not relevant to jitu.fi.

## 5. Network, deploy and verify

| | Monad testnet |
|---|---|
| Chain ID | **10143** |
| Currency | MON |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | `testnet.monadexplorer.com` |
| Faucet | `faucet.monad.xyz` |

Deploy with an encrypted Foundry keystore. The key never sits in a file or in an AI transcript:

```bash
cast wallet import deployer --interactive
forge script script/Deploy.s.sol --account deployer --rpc-url https://testnet-rpc.monad.xyz --broadcast
```

- Use a **fresh burner wallet** funded from the faucet.
- **A human runs the deploy command.** Don't paste private keys or seed phrases into an agent. The backend relayer/keeper keys live in a git-ignored `.env`, are testnet burners, and never go in chat.
- After deploy, give the agent only the safe details: addresses, chain ID 10143, RPC, ABI path (`contracts/out/...`), explorer.
- **Verification:** worth 25 points. Take the exact `forge verify-contract` flags (verifier + URL) from `docs.monad.xyz` before deploying, so verification can run in the same `forge script ... --verify` step. Don't guess them.

## 6. Ecosystem tools (what the slides list)

| Category | Listed | Our use |
|---|---|---|
| Oracles | **Pyth**, Chainlink, RedStone | Pyth matches our plan (`PythPriceOracle`, Hermes price stream). Addresses and feed IDs from Pyth docs only; otherwise `TODO_FILL_ME` + `MockPriceOracle` |
| RPC / wallets | Alchemy, QuickNode, MetaMask | A dedicated RPC (Alchemy or QuickNode) for the backend if the public RPC rate-limits the indexer |
| Indexers | Envio, Goldsky, Allium, Moralis | Not needed; our backend indexer is in the plan |
| Account abstraction | Privy, Para, mera (free), and others | Optional: email login + embedded wallet would cut demo friction. Not in the MVP plan |
| Bridges & swaps | Across, Chainlink CCIP, Wormhole, others | Not relevant (testnet, mock mUSD) |

Full catalog: `docs.monad.xyz/tooling-and-infra`.

## 7. Docs and AI resources

- `docs.monad.xyz/developer-essentials` — almost everything needed.
- `docs.monad.xyz/llms-full.txt` — the whole docs as one file for AI assistants.
- `developers.monad.xyz` — developer portal. `github.com/monad-developers` — examples and starter kits.
- **MONSKILLS** (`skills.devnads.com`, community, not audited by Monad): skills for faucet, contract deploy, frontend deploy, indexer. Claude Code install: `/plugin marketplace add therealharpaljadeja/monskills` then `/plugin install monskills@monskills`. Prompt library at `skills.devnads.com/prompts`.
- `app.monad.xyz/agents` — agent skills from ecosystem projects (Uniswap, Morpho, Kuru, Nad.fun, DevFun, Blinq.fi…).

## 8. Pitch tips from the organisers

1. **Fewer slides, more demo.** State the problem in one breath, then go live.
2. **No vibe-coded UI.** Give the LLM a brand kit (typeface, colour, components). We already have `frontend/DESIGN.md`.
3. **Pre-fill forms and stage the demo.** Have a wallet already funded, a deposit already active and a game ready to start, so judges see the magic, not typing. Say the repo link, contract address, live URL and "deployed today" out loud.

## 9. Post-Blitz

- **Monad Blitz Devcon Edition**, 2026-11-04, Mumbai. US$5,000 pool, teams of 2–3 (`luma.com/blitz-mumbai-devcon-2026`).
- MOST (open-source track, AI credits), BuildAnything.so, Delta V founder community.
- Monad Developers Indonesia Telegram group.
