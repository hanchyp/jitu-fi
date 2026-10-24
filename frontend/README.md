This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This frontend depends on the workspace package `@jitu-fi/shared`. Its exports point to
`packages/shared/dist`, which is generated and is not committed. The frontend's
`pnpm run build` builds that package before running `next build`, so a fresh checkout
does not depend on local build artifacts.

Configure the Vercel project with:

- **Root Directory:** `frontend`
- **Include source files outside of the Root Directory in the Build Step:** enabled
- **Framework Preset:** Next.js
- **Build Command:** `pnpm run build`

Run the workspace install from the repository root with `pnpm install --frozen-lockfile`.
Keep the repository's `pnpm-lock.yaml` and `pnpm-workspace.yaml` available to the build.
Set the public frontend environment variables using `.env.example` as a reference.
