// Serialized contract writes. Monad bills the gas limit, not gas used, so every tx carries an explicit
// limit of estimate × 1.15 (rounded up). Nonces come from a local counter per key so concurrent callers
// never race each other; the counter is reseeded from the pending count after any send error.
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  type Abi,
  type Account,
  type Address,
  type Chain,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
  type Transport,
  type WalletClient,
} from "viem";

export type KeyedWallet = WalletClient<Transport, Chain | undefined, Account>;
export type TxPublicClient = Pick<PublicClient, "estimateContractGas" | "getTransactionCount" | "waitForTransactionReceipt">;

export interface ContractCall<
  abi extends Abi = Abi,
  fn extends ContractFunctionName<abi, "nonpayable" | "payable"> = ContractFunctionName<abi, "nonpayable" | "payable">,
> {
  address: Address;
  abi: abi;
  functionName: fn;
  args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn>;
}

export const GAS_LIMIT_NUM = 115n;
export const GAS_LIMIT_DEN = 100n;

/** ceil(estimate × 115 / 100). */
export function gasLimitFor(estimate: bigint): bigint {
  return (estimate * GAS_LIMIT_NUM + GAS_LIMIT_DEN - 1n) / GAS_LIMIT_DEN;
}

/** The decoded custom error name when `err` is a contract revert, else undefined (RPC, nonce, gas, network). */
export function revertName(err: unknown): string | undefined {
  if (!(err instanceof BaseError)) return undefined;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (!(revert instanceof ContractFunctionRevertedError)) return undefined;
  return revert.data?.errorName ?? revert.signature ?? revert.reason ?? "reverted";
}

interface KeyQueue {
  tail: Promise<unknown>;
  nonce: number | undefined;
}

// One promise chain per (chain, account), shared by every sender built for that key.
const queues = new Map<string, KeyQueue>();

/** Test hook: forget all local nonce state. */
export function resetNonceQueues() {
  queues.clear();
}

export interface TxSender {
  readonly address: Address;
  /** Estimates, signs and broadcasts in nonce order. Resolves with the hash once broadcast. */
  send<abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(call: ContractCall<abi, fn>): Promise<Hash>;
  wait(hash: Hash): Promise<TransactionReceipt>;
  /** `send` and wait for the receipt (which may be reverted; check `status`). */
  sendAndWait<abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(
    call: ContractCall<abi, fn>,
  ): Promise<{ hash: Hash; receipt: TransactionReceipt }>;
}

export function createTxSender(publicClient: TxPublicClient, wallet: KeyedWallet): TxSender {
  const account = wallet.account;
  const key = `${wallet.chain?.id ?? "?"}:${account.address.toLowerCase()}`;
  let q = queues.get(key);
  if (!q) {
    q = { tail: Promise.resolve(), nonce: undefined };
    queues.set(key, q);
  }
  const queue = q;

  async function sendNow(call: ContractCall): Promise<Hash> {
    // Estimate errors (reverts included) consume no nonce, so they leave the counter alone.
    const estimate = await publicClient.estimateContractGas({ ...call, account } as never);
    const gas = gasLimitFor(estimate);
    if (queue.nonce === undefined) {
      queue.nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
    }
    const nonce = queue.nonce;
    try {
      const data = encodeFunctionData({ abi: call.abi, functionName: call.functionName, args: call.args } as never);
      const hash = await wallet.sendTransaction({ account, chain: wallet.chain, to: call.address, data, gas, nonce });
      queue.nonce = nonce + 1;
      return hash;
    } catch (err) {
      // The tx may or may not have reached the mempool; the pending count is the only safe reseed.
      queue.nonce = undefined;
      throw err;
    }
  }

  const sender: TxSender = {
    address: account.address,
    send(call) {
      const run = queue.tail.then(() => sendNow(call as ContractCall));
      queue.tail = run.catch(() => undefined);
      return run;
    },
    wait: (hash) => publicClient.waitForTransactionReceipt({ hash }),
    async sendAndWait(call) {
      const hash = await sender.send(call);
      return { hash, receipt: await sender.wait(hash) };
    },
  };
  return sender;
}
