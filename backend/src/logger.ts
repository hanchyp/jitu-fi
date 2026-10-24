import { pino, type Logger } from "pino";

export type { Logger };

export function createLogger(level: string): Logger {
  return pino({
    level,
    // Never log key material, even by accident.
    redact: { paths: ["*.privateKey", "*.KEEPER_PRIVATE_KEY", "*.SESSION_SECRET", "*.GAME_ID_SALT"], censor: "[redacted]" },
  });
}
