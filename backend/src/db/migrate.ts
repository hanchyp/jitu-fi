// `pnpm db:migrate`: applies pending migrations to DATABASE_URL.
import "dotenv/config";
import { loadConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { createDb, migrateDb } from "./client.js";

const config = loadConfig();
const log = createLogger(config.LOG_LEVEL);
await migrateDb(createDb(config.DATABASE_URL));
log.info({ database: config.DATABASE_URL }, "migrations applied");
