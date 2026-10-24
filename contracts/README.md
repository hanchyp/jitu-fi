# contracts

Solidity smart contracts for jitu.fi. Built with Foundry (≥ 1.8.0), Solidity ^0.8.24 and OpenZeppelin v5.

> **Status:** not scaffolded yet. The Foundry project (`foundry.toml`, `src/`, `test/`, `script/`) is created when Foundry is installed (tasks 0.3 and phase 1 in `openspec/changes/build-crypto-draft-mvp/tasks.md`).

## Network

Monad **testnet only**: chain id `10143`, RPC `https://testnet-rpc.monad.xyz`. Never deploy to mainnet (`143`).

## Planned contracts

| Contract | Role | Spec |
|---|---|---|
| `MockUSD` | 6-decimal test stablecoin with permit and an hourly faucet | `contracts-test-assets` |
| `IYieldStrategy`, `MockYieldStrategy` | Where the vault parks principal. The mock simulates APR | `contracts-test-assets` |
| `SeasonVault` | Season lifecycle, deposits, yield split (fee 15%, base 50%, bonus 50%), shortfall, claim that cannot be paused | `contracts-season-vault` |
| `GameManager` | 4-seat tables (1 human + 3 house bots for now), presets of 3/5/7/10 rounds: commit → reveal → live → settle, return-based scoring, EIP-712 meta-tx, first-K season points | `contracts-game-table` |
| Skills (in `GameManager`) | BOOST, INSURANCE, LOCK, FLIP, SWAP, FREEZE, hand scoped per table | `contracts-game-skills` |
| `CoinRegistry`, `IPriceOracle` (Pyth and mock), `IRandomness` | Coin list, prices, demo randomness | `contracts-market-data` |

Specs live in `openspec/changes/build-crypto-draft-mvp/specs/contracts-*/`.

## Safety rules

- Only `SeasonVault` holds tokens. `GameManager` never has token access and only writes season points.
- `claim` can never be paused. No admin function can move user principal.
- No season points are credited at or after season end, so claims can never exceed the bonus pot.
- Pyth addresses and feed ids come from official docs only. Until then they are `TODO_FILL_ME` and the mock oracle is used.

## Planned layout

```
contracts/
├─ src/        # contracts
├─ test/       # unit, fuzz, invariant, full-game scenario
├─ script/     # Deploy.s.sol (anvil and Monad testnet)
└─ foundry.toml
```
