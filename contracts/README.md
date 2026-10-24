# contracts

Solidity smart contracts for jitu.fi. Foundry, Solidity 0.8.28, OpenZeppelin v5.4 (vendored in `lib/`, no submodules). The plan is in [`docs/CONTRACTS_PLAN.md`](../docs/CONTRACTS_PLAN.md).

## Network

Monad **testnet only**: chain id `10143`, RPC `https://testnet-rpc.monad.xyz`, explorer `testnet.monadexplorer.com`, faucet `faucet.monad.xyz`. The deploy script refuses mainnet (`143`).

## Contracts

| Contract | Role |
|---|---|
| `MockUSD` | Testnet stablecoin "mUSD": 6 decimals, EIP-2612 permit, 1,000 mUSD faucet once per hour |
| `MockYieldStrategy` | Parks each season's principal (accounts keyed by season id) and simulates APR yield |
| `SeasonVault` | Seasons, deposits, yield split (fee 15%, then 50% base / 50% bonus), shortfall, claim that can't be paused |
| `GameManager` | Records one result per finished game (`recordGame`) and turns it into first-K season points with the end-of-season cutoff. Never touches tokens |

The game itself runs in the backend. See `DECISIONS.md` (2026-10-24).

## Test

```bash
forge test
```

Unit tests cover every contract. `test/Invariant.t.sol` fuzzes deposits, game records around the season end, finalize and claims. For the deep run (10,000 runs) use `FOUNDRY_PROFILE=deep forge test`.

## Deploy

Env vars (all optional):
- `DEMO_MODE`: default `true`. Demo mode gives a 2-minute enrollment, 15- and 30-minute seasons, the simulated APR and K = 2.
- `KEEPER_ADDRESS`: default is the deployer.
- `FEE_RECIPIENT`: default is the deployer.
- `POINTS_K`
- `SPONSOR_AMOUNT`: default 1,000 mUSD per season.

The script writes `deployments/<chainId>.json`.

Local:

```bash
anvil
```

```bash
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil dev key>
```

Monad testnet, with a burner wallet funded from the faucet and stored in an encrypted keystore. Keep the key out of files and chats.

```bash
cast wallet import deployer --interactive
```

```bash
KEEPER_ADDRESS=0x... forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --account deployer --broadcast
```

The keeper key needs more than 10 MON. On Monad, an account below the 10 MON reserve can only send one transaction every 3 blocks.

## Verify

Verify every contract after deploying. The MONSKILLS `scaffold` skill uses the devnads verification API, which covers all three explorers in one call. The fallback is sourcify:

```bash
forge verify-contract <address> src/SeasonVault.sol:SeasonVault --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/
```

## Deployments

| Contract | Monad testnet address |
|---|---|
| MockUSD | TBD |
| MockYieldStrategy | TBD |
| SeasonVault | TBD |
| GameManager | TBD |
