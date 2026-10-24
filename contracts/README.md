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

Monad testnet, deployed 2026-10-24 at block 73,722,191 by `0x51921009598763bDC1EA036403dcE294b84905E3` (also the keeper). Demo mode, K = 2. Season 1 ("1 week", 15 min) and season 2 ("1 month", 30 min) were created at deploy time, each with a 1,000 mUSD sponsor pot. Verified on MonadVision and Monadscan.

| Contract | Monad testnet address |
|---|---|
| MockUSD | [`0x888054c88594D673f3C77CE99Aa73373ACfA1BdC`](https://testnet.monadvision.com/address/0x888054c88594D673f3C77CE99Aa73373ACfA1BdC) |
| MockYieldStrategy | [`0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083`](https://testnet.monadvision.com/address/0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083) |
| SeasonVault | [`0x87e83410FD37F6FfC37BC709DaA7DE7B64460266`](https://testnet.monadvision.com/address/0x87e83410FD37F6FfC37BC709DaA7DE7B64460266) |
| GameManager | [`0x699834468547F56E38F87bFeeD15b3B2D6e343ff`](https://testnet.monadvision.com/address/0x699834468547F56E38F87bFeeD15b3B2D6e343ff) |

To redeploy, run `bash script/deploy-testnet.sh <keystore account>`. It checks the chain id, prints the deployer's balance, and broadcasts with `--slow` and a 15% gas buffer.
