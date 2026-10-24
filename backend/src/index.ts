// Backend entry point: one process running prices, the game engine, bots, matchmaker and the API.
// The keeper (season admin + recordGame) starts when its key and GAME_ID_SALT are set.
import "dotenv/config";
import { Auth } from "./api/auth.js";
import { createChainReads } from "./api/chain.js";
import { buildServer } from "./api/server.js";
import { createClients } from "./chain/clients.js";
import { loadConfig } from "./config.js";
import { createDb, migrateDb } from "./db/client.js";
import { HouseBots } from "./engine/bots.js";
import { GameEngine } from "./engine/engine.js";
import { Matchmaker } from "./engine/matchmaker.js";
import type { EngineEvent } from "./engine/types.js";
import { startKeeper } from "./keeper/keeper.js";
import { createLogger } from "./logger.js";
import { createPriceSource } from "./prices/index.js";

const config = loadConfig();
const log = createLogger(config.LOG_LEVEL);

const db = createDb(config.DATABASE_URL);
await migrateDb(db);
const { chain, publicClient } = createClients(config);
const chainReads = createChainReads(publicClient, config.CHAIN_ID, {
  vault: config.SEASON_VAULT_ADDRESS,
  game: config.GAME_MANAGER_ADDRESS,
});

const { book, source } = createPriceSource(config, log);
source.start();

const listeners: ((tableId: number, event: EngineEvent) => void)[] = [];
const engine = new GameEngine({ db, book, log: log.child({ module: "engine" }), onEvent: (id, e) => listeners.forEach((l) => l(id, e)) });
const bots = new HouseBots({ engine, log: log.child({ module: "bots" }) });
listeners.push(bots.handle);

const matchmaker = new Matchmaker({ db, engine, chain: chainReads });
const auth = new Auth(db, config.SIWE_DOMAIN, config.CHAIN_ID);
const { app, onEngineEvent } = await buildServer({ db, engine, matchmaker, chain: chainReads, auth, book, log, corsOrigin: config.CORS_ORIGIN });
listeners.push(onEngineEvent);

const resumed = await engine.resume();
await app.listen({ port: config.PORT, host: "0.0.0.0" });

// The keeper activates/finalizes seasons, renews demo seasons and posts finished games on-chain.
// Without its key the game still runs, but results stay queued (recordStatus = pending).
const stopKeeper =
  config.KEEPER_PRIVATE_KEY && config.GAME_ID_SALT
    ? startKeeper({ config, db, logger: log, publicClient })
    : (log.warn("KEEPER_PRIVATE_KEY or GAME_ID_SALT not set: keeper disabled, results stay queued"), async () => {});

log.info({ chainId: chain.id, demoMode: config.DEMO_MODE, priceSource: config.PRICE_SOURCE, resumed }, "backend started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    engine.stop();
    bots.stop();
    source.stop();
    await stopKeeper();
    await app.close();
    process.exit(0);
  });
}
