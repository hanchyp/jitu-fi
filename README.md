# jitu.fi

> Deposito on-chain di Monad. Pokok aman, bunga tetap jalan, dan kalau kamu jago, bunganya bisa berlipat.

A hackathon MVP on **Monad testnet**. Players deposit mUSD into a season vault and play **Crypto Draft**, a 4-player, 3-round coin-picking game. Principal always comes back in full. Game skill only decides how the yield is shared.

## Repo layout

| Folder | Stack | Status |
|---|---|---|
| `frontend/` | Next.js (App Router), Tailwind | Initialized |
| `backend/` | Node, TypeScript (Fastify, Zod planned) | Initialized |
| `contracts/` | Foundry, Solidity | README only |
| `packages/shared/` | Constants, scoring, ABIs | Planned |
| `bots/` | Demo and e2e players | Planned |

The full plan is in `openspec/changes/build-crypto-draft-mvp/`. The product spec is `CRYPTO_DRAFT_BUILD_SPEC.md`.

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
