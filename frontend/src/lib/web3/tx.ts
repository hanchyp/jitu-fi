import type { Abi, Address, Hash, WalletClient } from "viem";
import { monadTestnet, publicClient } from "./config";

type SendArgs = {
  wallet: WalletClient;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

/** Monad bills the gas limit, so every tx sets an explicit limit of estimate x 1.15. */
export async function sendTx({ wallet, address, abi, functionName, args = [] }: SendArgs): Promise<Hash> {
  const account = wallet.account;
  if (!account) throw new Error("Wallet is not connected");
  const gas = await publicClient.estimateContractGas({ address, abi, functionName, args, account } as never);
  const hash = await wallet.writeContract({
    address,
    abi,
    functionName,
    args,
    account,
    chain: monadTestnet,
    gas: (gas * BigInt(115) + BigInt(99)) / BigInt(100),
  } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  return hash;
}

/** A short, user-facing reason from a viem/wallet error. */
export function txErrorMessage(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string; name?: string };
  if (e.name === "UserRejectedRequestError" || /rejected|denied/i.test(e.message ?? "")) return "Transaction cancelled in your wallet.";
  if (/insufficient funds/i.test(e.message ?? "")) return "Not enough MON for gas. Get testnet MON from the faucet first.";
  return e.shortMessage ?? e.message ?? "Transaction failed.";
}
