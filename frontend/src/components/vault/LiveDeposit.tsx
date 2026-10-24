"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Address } from "viem";
import { useWallet } from "@/components/shell/WalletProvider";
import { Board } from "@/components/ui/Board";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameActionButton } from "@/components/ui/GameButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePosition, useSeasons } from "@/lib/api/hooks";
import type { PositionResponse, SeasonSummary } from "@/lib/api/types";
import { ABIS, ADDRESSES, deployment, publicClient } from "@/lib/web3/config";
import { sendTx } from "@/lib/web3/tx";
import { DepositScreen } from "./DepositScreen";
import type { PositionView, TenorOption, VaultRules, WalletView } from "./types";

const TENOR_LABEL = { week: "1 week", month: "1 month" } as const;
const DEMO_MINUTES = { week: 15, month: 30 } as const;
const MIN_DEPOSIT = BigInt(10_000_000);
const WEIGHT_CAP = BigInt(1_000_000_000);

const nowSeconds = () => Math.floor(Date.now() / 1000);

function toOptions(seasons: SeasonSummary[]): TenorOption[] {
  const now = nowSeconds();
  // The newest season of each tenor.
  const byTenor = new Map<SeasonSummary["tenor"], SeasonSummary>();
  for (const s of seasons) if (!byTenor.has(s.tenor)) byTenor.set(s.tenor, s);
  return [...byTenor.values()]
    .sort((a, b) => (a.tenor === b.tenor ? 0 : a.tenor === "week" ? -1 : 1))
    .map((s) => ({
      tenor: s.tenor,
      seasonId: s.seasonId,
      label: TENOR_LABEL[s.tenor],
      demoMinutes: DEMO_MINUTES[s.tenor],
      enrollSecondsLeft: now < s.start ? s.start - now : 0,
      bonusPot: s.bonusPot,
      sponsorFunds: s.sponsorFunds,
      maturitySeconds: Math.max(0, s.end - now),
    }));
}

function toPosition(p: PositionResponse): PositionView {
  const now = nowSeconds();
  return {
    seasonId: p.seasonId,
    tenor: p.tenor,
    tenorLabel: TENOR_LABEL[p.tenor],
    status: now < p.start ? "enrolling" : "active",
    principal: p.principal,
    baseYield: p.previewClaim.baseYield,
    bonus: p.previewClaim.bonus,
    secondsToStart: Math.max(0, p.start - now),
    secondsToMaturity: Math.max(0, p.end - now),
    gamesCounted: p.gamesCounted,
    countedGames: p.countedGames,
  };
}

async function readWallet(address: Address) {
  const musd = { address: ADDRESSES.musd, abi: ABIS.musd } as const;
  const [balance, lastFaucetAt, faucetAmount, cooldown] = await Promise.all([
    publicClient.readContract({ ...musd, functionName: "balanceOf", args: [address] }),
    publicClient.readContract({ ...musd, functionName: "lastFaucetAt", args: [address] }),
    publicClient.readContract({ ...musd, functionName: "FAUCET_AMOUNT" }),
    publicClient.readContract({ ...musd, functionName: "FAUCET_COOLDOWN" }),
  ]);
  return { balance, lastFaucetAt: Number(lastFaucetAt), faucetAmount, cooldown: Number(cooldown) };
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Lock your deposit</h1>
      <Board className="mx-auto mt-8 max-w-2xl">{children}</Board>
    </section>
  );
}

function DepositLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" role="status" aria-label="Loading deposit">
      <Skeleton className="h-12 w-72 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

/** /deposit with real data and transactions: faucet, approve, then SeasonVault.deposit. */
export function LiveDeposit() {
  const { ready, address, connect, getWalletClient } = useWallet();
  const queryClient = useQueryClient();
  const seasons = useSeasons();
  const position = usePosition(address);
  const wallet = useQuery({
    queryKey: ["wallet", address],
    queryFn: () => readWallet(address as Address),
    enabled: address !== null,
  });

  const faucet = useCallback(async () => {
    if (!address) throw new Error("Connect a wallet first");
    const client = await getWalletClient();
    return sendTx({ wallet: client, address: ADDRESSES.musd, abi: ABIS.musd, functionName: "faucet" });
  }, [address, getWalletClient]);

  const deposit = useCallback(
    async (seasonId: number, amount: bigint) => {
      if (!address) throw new Error("Connect a wallet first");
      const client = await getWalletClient();
      const allowance = await publicClient.readContract({
        address: ADDRESSES.musd,
        abi: ABIS.musd,
        functionName: "allowance",
        args: [address, ADDRESSES.vault],
      });
      if (allowance < amount) {
        await sendTx({ wallet: client, address: ADDRESSES.musd, abi: ABIS.musd, functionName: "approve", args: [ADDRESSES.vault, amount] });
      }
      const hash = await sendTx({
        wallet: client,
        address: ADDRESSES.vault,
        abi: ABIS.vault,
        functionName: "deposit",
        args: [BigInt(seasonId), amount],
      });
      void queryClient.invalidateQueries({ queryKey: ["position"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      return hash;
    },
    [address, getWalletClient, queryClient],
  );

  if (!ready || (address && (wallet.isPending || seasons.isPending || position.isPending))) return <DepositLoading />;

  if (!address) {
    return (
      <Message>
        <EmptyState
          art="/assets/landing/deposit-chest.webp"
          title="Connect to deposit"
          body="Sign in with email, a social account or your wallet. New players get a wallet automatically."
          action={<GameActionButton size="lg" onClick={connect}>Connect</GameActionButton>}
        />
      </Message>
    );
  }

  if (wallet.isError || seasons.isError || position.isError || !wallet.data) {
    const retry = () => {
      void wallet.refetch();
      void seasons.refetch();
      void position.refetch();
    };
    return (
      <Message>
        <EmptyState
          title="Could not load the vault"
          body="The API or the network did not answer. Check your connection and try again."
          action={<GameActionButton onClick={retry}>Retry</GameActionButton>}
        />
      </Message>
    );
  }

  const options = toOptions(seasons.data ?? []);
  if (options.length === 0) {
    return (
      <Message>
        <EmptyState title="No season is open" body="The next season opens soon. Come back in a few minutes." />
      </Message>
    );
  }

  const w = wallet.data;
  const faucetReadyAt = w.lastFaucetAt === 0 ? 0 : w.lastFaucetAt + w.cooldown;
  const walletView: WalletView = { balance: w.balance, faucetSecondsLeft: Math.max(0, faucetReadyAt - nowSeconds()) };
  const rules: VaultRules = {
    minDeposit: MIN_DEPOSIT,
    weightCap: WEIGHT_CAP,
    faucetAmount: w.faucetAmount,
    faucetCooldownSeconds: w.cooldown,
    countedGames: deployment.pointsK,
  };
  const current = position.data ? toPosition(position.data) : null;

  return (
    <DepositScreen
      key={address}
      rules={rules}
      wallet={walletView}
      options={options}
      initialTenor={current?.tenor ?? options[0].tenor}
      position={current}
      actions={{ faucet, deposit }}
    />
  );
}
