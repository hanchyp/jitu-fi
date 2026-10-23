import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Server only. The stats art (medals, empty-state scenes) is produced in parallel with these screens, so a
 * file is used only once it exists in public/assets/stats; until then callers fall back to styled UI.
 * Synchronous I/O is prerendered into the static shell (Next 16 caching docs, "Predictable values").
 */
export function statsArt(file: string): string | undefined {
  return existsSync(path.join(process.cwd(), "public", "assets", "stats", file)) ? `/assets/stats/${file}` : undefined;
}
