import { gameManagerAbi, seasonVaultAbi } from "@jitu-fi/shared";
import { BaseError, ContractFunctionRevertedError, encodeErrorResult, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainReader } from "../src/chain/contracts.js";
import { createTxSender, gasLimitFor, resetNonceQueues, revertName, type KeyedWallet, type TxPublicClient } from "../src/chain/sendTx.js";

const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const GAME = "0x699834468547F56E38F87bFeeD15b3B2D6e343ff" as const;
const call = { address: GAME, abi: gameManagerAbi, functionName: "recordGame" as const, args: [`0x${"11".repeat(32)}`, account.address, 1n, `0x${"00".repeat(32)}`] as const };

export function revertError(errorName: string) {
  const data = encodeErrorResult({ abi: gameManagerAbi, errorName } as never);
  const revert = new ContractFunctionRevertedError({ abi: gameManagerAbi, data, functionName: "recordGame" });
  return new BaseError("estimate failed", { cause: revert });
}

function mocks(startNonce = 7) {
  const publicClient = {
    estimateContractGas: vi.fn(async () => 100_001n),
    getTransactionCount: vi.fn(async () => startNonce),
    waitForTransactionReceipt: vi.fn(),
  };
  const sent: { nonce: number; gas: bigint }[] = [];
  const wallet = {
    account,
    chain: { id: 10143 },
    sendTransaction: vi.fn(async (tx: { nonce: number; gas: bigint }) => {
      // Random latency so a broken queue would reorder.
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      sent.push({ nonce: tx.nonce, gas: tx.gas });
      return `0x${tx.nonce.toString(16).padStart(64, "0")}` as Hash;
    }),
  };
  return { publicClient, wallet, sent, sender: createTxSender(publicClient as unknown as TxPublicClient, wallet as unknown as KeyedWallet) };
}

beforeEach(() => resetNonceQueues());

describe("gasLimitFor", () => {
  it("is ceil(estimate × 1.15)", () => {
    expect(gasLimitFor(100_000n)).toBe(115_000n);
    expect(gasLimitFor(100_001n)).toBe(115_002n); // 115001.15 rounds up
    expect(gasLimitFor(1n)).toBe(2n);
    expect(gasLimitFor(0n)).toBe(0n);
    expect(gasLimitFor(21_000n)).toBe(24_150n);
  });
});

describe("createTxSender", () => {
  it("gives 10 concurrent sends consecutive nonces in call order", async () => {
    const { sender, sent, publicClient } = mocks(7);
    const hashes = await Promise.all(Array.from({ length: 10 }, () => sender.send(call)));
    expect(sent.map((s) => s.nonce)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(hashes[0]).toMatch(/7$/);
    expect(publicClient.getTransactionCount).toHaveBeenCalledTimes(1);
    expect(sent.every((s) => s.gas === 115_002n)).toBe(true);
  });

  it("shares the nonce counter between senders for the same key", async () => {
    const a = mocks(3);
    const b = createTxSender(a.publicClient as unknown as TxPublicClient, a.wallet as unknown as KeyedWallet);
    await Promise.all([a.sender.send(call), b.send(call), a.sender.send(call)]);
    expect(a.sent.map((s) => s.nonce)).toEqual([3, 4, 5]);
  });

  it("reseeds from the pending count after a send error", async () => {
    const { sender, wallet, publicClient, sent } = mocks(5);
    await sender.send(call);
    wallet.sendTransaction.mockRejectedValueOnce(new Error("nonce too low"));
    await expect(sender.send(call)).rejects.toThrow("nonce too low");
    publicClient.getTransactionCount.mockResolvedValueOnce(9);
    await sender.send(call);
    expect(sent.map((s) => s.nonce)).toEqual([5, 9]);
    expect(publicClient.getTransactionCount).toHaveBeenCalledTimes(2);
  });

  it("does not burn a nonce when the estimate reverts, and keeps the queue going", async () => {
    const { sender, publicClient, sent } = mocks(0);
    publicClient.estimateContractGas.mockRejectedValueOnce(revertError("AlreadyRecorded"));
    const results = await Promise.allSettled([sender.send(call), sender.send(call)]);
    expect(results[0]!.status).toBe("rejected");
    expect(revertName((results[0] as PromiseRejectedResult).reason)).toBe("AlreadyRecorded");
    expect(sent.map((s) => s.nonce)).toEqual([0]);
  });
});

describe("revertName", () => {
  it("names decoded custom errors and ignores transport errors", () => {
    expect(revertName(revertError("SeasonNotActive"))).toBe("SeasonNotActive");
    expect(revertName(new Error("fetch failed"))).toBeUndefined();
    expect(revertName(new BaseError("HTTP request failed"))).toBeUndefined();
  });
});

describe("createChainReader", () => {
  const addresses = { vault: "0x87e83410FD37F6FfC37BC709DaA7DE7B64460266", game: GAME, token: "0x888054c88594D673f3C77CE99Aa73373ACfA1BdC" } as const;

  it("caches reads for the TTL and maps season status", async () => {
    let now = 0;
    const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
      if (functionName === "getSeason") {
        return { enrollStart: 1n, start: 2n, end: 3n, status: 2, shortfall: false, depositors: 0, claims: 0, totalPrincipal: 0n, sponsorFunds: 0n, returnedPrincipal: 0n, fee: 0n, baseYield: 0n, bonusPot: 0n, totalWeightedPoints: 0n, paidOut: 0n };
      }
      if (functionName === "previewClaim") return [1n, 2n, 3n];
      return 42n;
    });
    const reader = createChainReader({ readContract } as never, addresses, { ttlMs: 3_000, nowMs: () => now });

    expect((await reader.getSeason(1n)).status).toBe("Active");
    expect(await reader.previewClaim(1n, account.address)).toEqual({ principalPart: 1n, basePart: 2n, bonusPart: 3n });
    await reader.seasonPoints(1n, account.address);
    await reader.seasonPoints(1n, account.address);
    expect(readContract).toHaveBeenCalledTimes(3);
    now = 3_001;
    await reader.seasonPoints(1n, account.address);
    expect(readContract).toHaveBeenCalledTimes(4);
    expect(readContract.mock.calls.at(-1)![0]).toMatchObject({ address: GAME, functionName: "seasonPoints" });
    expect(readContract.mock.calls[0]![0]).toMatchObject({ abi: seasonVaultAbi });
  });

  it("does not cache failures", async () => {
    const readContract = vi.fn().mockRejectedValueOnce(new Error("rpc down")).mockResolvedValueOnce(5n);
    const reader = createChainReader({ readContract } as never, addresses, { nowMs: () => 0 });
    await expect(reader.seasonCount()).rejects.toThrow("rpc down");
    expect(await reader.seasonCount()).toBe(5n);
  });
});
