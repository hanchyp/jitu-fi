import { describe, expect, it } from "vitest";
import { loadConfig, requireConfig } from "../src/config.js";

const base = { CHAIN_ID: "10143", RPC_URL: "https://testnet-rpc.monad.xyz" };

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig(base);
    expect(config.PORT).toBe(4000);
    expect(config.DEMO_MODE).toBe(false);
    expect(config.MULTI_HUMAN_QUEUE).toBe(false);
    expect(config.PRICE_SOURCE).toBe("hermes");
    expect(config.DATABASE_URL).toBe("file:./data/jitu.db");
  });

  it("defaults to mock prices on anvil", () => {
    expect(loadConfig({ ...base, CHAIN_ID: "31337" }).PRICE_SOURCE).toBe("mock");
  });

  it("refuses Monad mainnet", () => {
    expect(() => loadConfig({ ...base, CHAIN_ID: "143" })).toThrow(/mainnet \(143\) is not allowed/);
  });

  it("refuses unknown chains", () => {
    expect(() => loadConfig({ ...base, CHAIN_ID: "1" })).toThrow(/CHAIN_ID/);
  });

  it("parses booleans and treats empty strings as unset", () => {
    const config = loadConfig({ ...base, DEMO_MODE: "true", KEEPER_PRIVATE_KEY: "", PRICE_SOURCE: "" });
    expect(config.DEMO_MODE).toBe(true);
    expect(config.KEEPER_PRIVATE_KEY).toBeUndefined();
    expect(config.PRICE_SOURCE).toBe("hermes");
  });

  it("rejects malformed keys and addresses", () => {
    expect(() => loadConfig({ ...base, KEEPER_PRIVATE_KEY: "0x1234" })).toThrow(/KEEPER_PRIVATE_KEY/);
    expect(() => loadConfig({ ...base, SEASON_VAULT_ADDRESS: "not-an-address" })).toThrow(/SEASON_VAULT_ADDRESS/);
  });

  it("requireConfig names the missing variable", () => {
    expect(() => requireConfig(loadConfig(base), "GAME_ID_SALT")).toThrow("GAME_ID_SALT is required");
  });
});
