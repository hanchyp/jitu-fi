// Backend entry point. Modules (api, matchmaker, engine, keeper, indexer, prices) are wired in as they land.
import "dotenv/config";
import { createClients } from "./chain/clients.js";
import { loadConfig } from "./config.js";
import { createDb, migrateDb } from "./db/client.js";
import { createLogger } from "./logger.js";

const config = loadConfig();
const log = createLogger(config.LOG_LEVEL);

const db = createDb(config.DATABASE_URL);
await migrateDb(db);
const { chain } = createClients(config);

log.info({ chainId: chain.id, demoMode: config.DEMO_MODE, priceSource: config.PRICE_SOURCE }, "backend started");
