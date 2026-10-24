import { describe, expect, it } from "vitest";
import {
  capSum,
  gameManagerAbi,
  getDeployment,
  presetMaxDurationSeconds,
  seasonVaultAbi,
  MONAD_TESTNET,
  LOCAL_ANVIL,
} from "../src/index.js";

const names = (abi: readonly { type: string; name?: string }[], type: string) =>
  abi.filter((x) => x.type === type).map((x) => x.name);

describe("deployments", () => {
  it("has checksummed-looking addresses for every supported chain", () => {
    for (const id of [MONAD_TESTNET.id, LOCAL_ANVIL.id]) {
      const d = getDeployment(id);
      expect(d.chainId).toBe(id);
      for (const a of [d.MockUSD, d.MockYieldStrategy, d.SeasonVault, d.GameManager]) {
        expect(a).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
    }
  });

  it("never knows Monad mainnet", () => {
    expect(() => getDeployment(143)).toThrow();
  });
});

describe("abis", () => {
  it("exposes the vault and game surface the backend uses", () => {
    expect(names(seasonVaultAbi, "function")).toEqual(
      expect.arrayContaining(["deposit", "activate", "finalize", "claim", "previewClaim", "createSeason", "fundBonus"]),
    );
    expect(names(seasonVaultAbi, "event")).toEqual(expect.arrayContaining(["Deposited", "SeasonFinalized", "Claimed"]));
    expect(names(gameManagerAbi, "function")).toEqual(expect.arrayContaining(["recordGame", "seasonPoints"]));
    expect(names(gameManagerAbi, "event")).toEqual(expect.arrayContaining(["GameRecorded", "PointsSkipped"]));
  });
});

describe("config", () => {
  it("cap sums match the preset table", () => {
    expect(capSum("quick")).toBe(6);
    expect(capSum("standard")).toBe(9);
    expect(capSum("long")).toBe(16);
    expect(capSum("marathon")).toBe(30);
  });

  it("a Quick game fits in about 8 minutes", () => {
    expect(presetMaxDurationSeconds("quick")).toBeLessThanOrEqual(9 * 60);
  });
});
