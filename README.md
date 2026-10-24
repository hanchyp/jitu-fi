# jitu.fi

> Deposito on-chain di Monad. Pokok aman, bunga tetap jalan, dan kalau kamu jago, bunganya bisa berlipat.

A hackathon MVP on **Monad testnet**. Players deposit mUSD into a season vault and play **Crypto Draft**, a 4-player, 3-round coin-picking game. Principal always comes back in full. Game skill only decides how the yield is shared.

## Repo layout

| Folder | Stack | Status |
|---|---|---|
| `frontend/` | Next.js (App Router), Tailwind | Initialized |
| `backend/` | Node, TypeScript (Fastify, Zod planned) | Initialized |
| `contracts/` | Foundry, Solidity | Deployed and verified on Monad testnet |
| `packages/shared/` | Constants, contract ABIs, deployments (scoring coming from the backend session) | Scaffolded |
| `bots/` | Demo and e2e players | Planned |

The full plan is in `openspec/changes/build-crypto-draft-mvp/`. The product spec is `CRYPTO_DRAFT_BUILD_SPEC.md`.

## Deployed contracts (Monad testnet, chain id 10143)

Deployed on 2026-10-24 during Monad Blitz Jogja. All four are verified on MonadVision and Monadscan.

| Contract | Address | Explorer |
|---|---|---|
| MockUSD (mUSD) | `0x888054c88594D673f3C77CE99Aa73373ACfA1BdC` | [MonadVision](https://testnet.monadvision.com/address/0x888054c88594D673f3C77CE99Aa73373ACfA1BdC) · [Monadscan](https://testnet.monadscan.com/address/0x888054c88594D673f3C77CE99Aa73373ACfA1BdC) |
| MockYieldStrategy | `0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083` | [MonadVision](https://testnet.monadvision.com/address/0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083) · [Monadscan](https://testnet.monadscan.com/address/0xD3f940AF0AfA2fde97012A7aBd8eB4B95766F083) |
| SeasonVault | `0x87e83410FD37F6FfC37BC709DaA7DE7B64460266` | [MonadVision](https://testnet.monadvision.com/address/0x87e83410FD37F6FfC37BC709DaA7DE7B64460266) · [Monadscan](https://testnet.monadscan.com/address/0x87e83410FD37F6FfC37BC709DaA7DE7B64460266) |
| GameManager | `0x699834468547F56E38F87bFeeD15b3B2D6e343ff` | [MonadVision](https://testnet.monadvision.com/address/0x699834468547F56E38F87bFeeD15b3B2D6e343ff) · [Monadscan](https://testnet.monadscan.com/address/0x699834468547F56E38F87bFeeD15b3B2D6e343ff) |

Machine-readable addresses: [`contracts/deployments/10143.json`](contracts/deployments/10143.json). How to test, deploy and verify: [`contracts/README.md`](contracts/README.md).

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm build
```

Run the frontend:

```bash
pnpm dev:frontend   # http://localhost:3000
```

Copy `backend/.env.example` to `backend/.env` before running the backend against a real network.
