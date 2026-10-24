import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema.js";

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

export type Db = ReturnType<typeof createDb>;

/** Opens the database. `file:` URLs get their folder created; `:memory:` is for tests. */
export function createDb(url: string) {
  if (url.startsWith("file:")) mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  const client = createClient({ url });
  return drizzle(client, { schema });
}

export async function migrateDb(db: Db) {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
