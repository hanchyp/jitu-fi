import { z } from "zod";

const MAINNET_CHAIN_ID = 143;

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 0x-prefixed 20-byte address");
const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "must be a 0x-prefixed 32-byte hex value");
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    CHAIN_ID: z.coerce
      .number()
      .int()
      .refine((id) => id !== MAINNET_CHAIN_ID, "Monad mainnet (143) is not allowed; use testnet 10143 or anvil 31337")
      .refine((id) => id === 10143 || id === 31337, "CHAIN_ID must be 10143 (Monad testnet) or 31337 (anvil)"),
    RPC_URL: z.url(),
    WS_URL: optional(z.url()),
    DATABASE_URL: z.string().min(1).default("file:./data/jitu.db"),
    DEMO_MODE: z.stringbool().default(false),
    MULTI_HUMAN_QUEUE: z.stringbool().default(false),
    PRICE_SOURCE: optional(z.enum(["hermes", "mock"])),
    PYTH_HERMES_URL: z.url().default("https://hermes.pyth.network"),
    // Hermes requires a key since the 2026-08-26 Pyth Core upgrade (Pyth Terminal sign-up).
    PYTH_API_KEY: optional(z.string().min(1)),
    // Keys and addresses are optional at boot; the module that needs one asserts it is set.
    KEEPER_PRIVATE_KEY: optional(bytes32),
    GAME_ID_SALT: optional(bytes32),
    MOCK_USD_ADDRESS: optional(address),
    SEASON_VAULT_ADDRESS: optional(address),
    GAME_MANAGER_ADDRESS: optional(address),
    INDEXER_START_BLOCK: z.coerce.number().int().min(0).default(0),
    SIWE_DOMAIN: z.string().min(1).default("localhost:3000"),
    SESSION_SECRET: optional(z.string().min(32, "SESSION_SECRET must be at least 32 characters")),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  })
  .transform((env) => ({
    ...env,
    // Local anvil runs use the random-walk mock unless told otherwise.
    PRICE_SOURCE: env.PRICE_SOURCE ?? (env.CHAIN_ID === 31337 ? "mock" : "hermes"),
  }));

export type Config = z.output<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid backend environment:\n${issues}`);
  }
  return parsed.data;
}

/** Returns a value a module cannot run without, or throws naming the missing variable. */
export function requireConfig<K extends keyof Config>(config: Config, key: K): NonNullable<Config[K]> {
  const value = config[key];
  if (value === undefined || value === null) throw new Error(`${String(key)} is required for this module`);
  return value as NonNullable<Config[K]>;
}
