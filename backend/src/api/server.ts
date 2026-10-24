// REST + WebSocket API (Fastify). Reads come from the chain and the engine; writes (play, picks,
// skills) need a SIWE session token in `Authorization: Bearer <token>`.
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { PRESETS, SKILLS, type PresetId } from "@jitu-fi/shared";
import { eq } from "drizzle-orm";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { tables } from "../db/schema.js";
import { canonicalJson, type GameEngine } from "../engine/engine.js";
import type { Matchmaker } from "../engine/matchmaker.js";
import { GameError, type EngineEvent, type TableState } from "../engine/types.js";
import type { Logger } from "../logger.js";
import type { PriceBook } from "../prices/book.js";
import { COINS } from "../prices/feeds.js";
import { Auth, AuthError } from "./auth.js";
import type { ChainReads } from "./chain.js";
import { currentSeasons, history, leaderboard, position } from "./views.js";

export type ServerDeps = {
  db: Db;
  engine: GameEngine;
  matchmaker: Matchmaker;
  chain: ChainReads;
  auth: Auth;
  book: PriceBook;
  log: Logger;
  corsOrigin: string;
  /** Price broadcast interval; 0 disables it (tests). */
  priceTickMs?: number;
  /** Admin controls (phase skip, new season). Set only on Monad testnet; absent, they answer 403. */
  admin?: {
    /** On-chain SEASON_MANAGER_ROLE check on the vault. */
    isSeasonManager(address: string): Promise<boolean>;
    /** The keeper's serialized createSeason; absent when the keeper or DEMO_MODE is off. */
    createSeason?: (tenor: "week" | "month") => Promise<{ seasonId: bigint; hash: string }>;
  };
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const id = z.coerce.number().int().positive();
const side = z.enum(["Buy", "Sell"]);
const playBody = z.object({ preset: z.enum(Object.keys(PRESETS) as [PresetId, ...PresetId[]]) });
const picksBody = z.object({
  picks: z.array(z.object({ coin: z.string(), side, boosted: z.boolean().optional(), insured: z.boolean().optional() })).max(5),
});
const skillBody = z.object({
  skill: z.enum(["LOCK", "FREEZE", "FLIP", "SWAP"]),
  targetSeat: z.number().int().min(0).max(3),
  targetCoin: z.string(),
  swapTo: z.string().optional(),
});
const advanceBody = z.object({ phase: z.enum(["Commit", "Reveal", "Live"]), round: z.number().int().positive() });
const seasonBody = z.object({ tenor: z.enum(["week", "month"]) });
const verifyBody = z.object({ message: z.string().min(1), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });

const json = (value: unknown) => JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

/** Rooms: `table:<id>`, `prices`, and `lobby:<preset>` (reserved for the disabled multi-human queue). */
export class Rooms {
  private readonly rooms = new Map<string, Set<WebSocket>>();

  join(room: string, socket: WebSocket) {
    let set = this.rooms.get(room);
    if (!set) this.rooms.set(room, (set = new Set()));
    set.add(socket);
  }

  leave(socket: WebSocket, room?: string) {
    for (const [name, set] of this.rooms) if (!room || room === name) set.delete(socket);
  }

  broadcast(room: string, payload: unknown) {
    const set = this.rooms.get(room);
    if (!set?.size) return;
    const data = json({ room, ...(payload as object) });
    for (const socket of set) if (socket.readyState === 1) socket.send(data);
  }

  size(room: string) {
    return this.rooms.get(room)?.size ?? 0;
  }
}

export async function buildServer(deps: ServerDeps) {
  const { db, engine, matchmaker, chain, auth, book, log } = deps;
  const app = Fastify({ loggerInstance: log });
  const rooms = new Rooms();
  app.setReplySerializer((payload) => json(payload));
  await app.register(cors, { origin: deps.corsOrigin.split(",").map((s) => s.trim()) });
  await app.register(websocket);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof z.ZodError) return reply.status(400).send({ error: "BAD_REQUEST", issues: err.issues });
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code, message: err.message });
    if (err instanceof AuthError) return reply.status(401).send({ error: "UNAUTHORIZED", message: err.message });
    if (err instanceof GameError) {
      const status = err.code === "ALREADY_AT_TABLE" ? 409 : err.code === "TABLE_NOT_RUNNING" ? 404 : 400;
      return reply.status(status).send({ error: err.code, message: err.message, ...("tableId" in err ? { tableId: err.tableId } : {}) });
    }
    log.error({ err }, "request failed");
    return reply.status(500).send({ error: "INTERNAL" });
  });

  async function requireUser(req: FastifyRequest): Promise<string> {
    const header = req.headers.authorization;
    const user = await auth.session(header?.startsWith("Bearer ") ? header.slice(7) : undefined);
    if (!user) throw new AuthError("sign in with Ethereum first");
    return user;
  }

  /** Signed-in wallet that holds SEASON_MANAGER_ROLE on-chain right now. */
  async function requireAdmin(req: FastifyRequest): Promise<string> {
    const user = await requireUser(req);
    if (!deps.admin) throw new HttpError(403, "ADMIN_DISABLED", "admin controls run on Monad testnet only");
    if (!(await deps.admin.isSeasonManager(user))) throw new HttpError(403, "NOT_SEASON_MANAGER", "this wallet does not hold SEASON_MANAGER_ROLE");
    return user;
  }

  async function optionalUser(req: FastifyRequest) {
    const header = req.headers.authorization;
    return header?.startsWith("Bearer ") ? auth.session(header.slice(7)) : null;
  }

  async function tableView(tableId: number, viewer: string | null) {
    if (engine.get(tableId)) return engine.view(tableId, viewer ?? undefined);
    const [row] = await db.select().from(tables).where(eq(tables.id, tableId));
    if (!row) throw new GameError("TABLE_NOT_RUNNING", "no such table");
    return JSON.parse(row.state) as TableState;
  }

  // ---------- Reads ----------

  app.get("/health", async () => ({ ok: true, prices: COINS.map((c) => ({ coin: c, source: book.latest(c)?.source ?? null, publishTime: book.latest(c)?.publishTime ?? null })) }));
  app.get("/config", async () => ({ presets: PRESETS, skills: SKILLS, coins: COINS }));
  app.get("/seasons/current", async () => currentSeasons(chain));
  app.get("/seasons/:id/leaderboard", async (req) => leaderboard(db, chain, id.parse((req.params as { id: string }).id)));
  app.get("/users/:addr/position", async (req) => position(chain, address.parse((req.params as { addr: string }).addr).toLowerCase()));
  app.get("/users/:addr/history", async (req) => history(db, chain, address.parse((req.params as { addr: string }).addr)));
  app.get("/users/:addr/table", async (req) => ({ tableId: await matchmaker.runningTable(address.parse((req.params as { addr: string }).addr)) }));
  app.get("/tables/:id", async (req) => tableView(id.parse((req.params as { id: string }).id), await optionalUser(req)));
  app.get("/tables/:id/log", async (req, reply: FastifyReply) => {
    const [row] = await db.select().from(tables).where(eq(tables.id, id.parse((req.params as { id: string }).id)));
    if (!row || row.status !== "Finished") throw new GameError("TABLE_NOT_RUNNING", "the log is published when the game finishes");
    // logHash = keccak256 of exactly this body.
    return reply.header("x-log-hash", row.logHash ?? "").type("application/json").send(canonicalJson(JSON.parse(row.state)));
  });

  // ---------- Auth ----------

  app.post("/auth/nonce", async () => ({ nonce: await auth.nonce() }));
  app.post("/auth/verify", async (req) => {
    const body = verifyBody.parse(req.body);
    return auth.verify(body.message, body.signature as `0x${string}`);
  });

  // ---------- Play ----------

  app.post("/play", async (req) => matchmaker.play(await requireUser(req), playBody.parse(req.body).preset));
  app.post("/tables/:id/picks", async (req) => {
    const user = await requireUser(req);
    await engine.submitPicks(id.parse((req.params as { id: string }).id), user, picksBody.parse(req.body).picks);
    return { ok: true };
  });
  app.post("/tables/:id/skill", async (req) => {
    const user = await requireUser(req);
    return { skill: await engine.useSkill(id.parse((req.params as { id: string }).id), user, skillBody.parse(req.body)) };
  });

  // ---------- Admin (season managers only) ----------

  app.post("/tables/:id/advance", async (req) => {
    const user = await requireAdmin(req);
    const tableId = id.parse((req.params as { id: string }).id);
    const body = advanceBody.parse(req.body);
    // Own single-human bot table only: never another player's game.
    const table = engine.get(tableId);
    if (!table) throw new GameError("TABLE_NOT_RUNNING", "no such table");
    if (table.seats[0]!.address !== user) throw new HttpError(403, "NOT_YOUR_TABLE", "skip works on your own table only");
    return { advanced: await engine.skipPhase(tableId, body) };
  });

  let creatingSeason = false;
  app.post("/admin/seasons", async (req) => {
    await requireAdmin(req);
    const { tenor } = seasonBody.parse(req.body);
    const create = deps.admin?.createSeason;
    if (!create) throw new HttpError(503, "KEEPER_UNAVAILABLE", "the keeper is not running with DEMO_MODE on");
    if (creatingSeason) throw new HttpError(409, "SEASON_CREATE_PENDING", "a season is already being created");
    creatingSeason = true;
    try {
      const { seasonId, hash } = await create(tenor);
      return { seasonId: Number(seasonId), hash, tenor };
    } catch (err) {
      log.warn({ err, tenor }, "admin createSeason failed");
      throw new HttpError(502, "SEASON_CREATE_FAILED", "createSeason failed on-chain; check the keeper balance and role");
    } finally {
      creatingSeason = false;
    }
  });

  // ---------- WebSocket ----------

  app.get("/ws", { websocket: true }, (socket) => {
    socket.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as { subscribe?: string; unsubscribe?: string };
        if (msg.subscribe && /^(table:\d+|prices|lobby:\w+)$/.test(msg.subscribe)) {
          rooms.join(msg.subscribe, socket);
          socket.send(json({ room: msg.subscribe, type: "subscribed" }));
        }
        if (msg.unsubscribe) rooms.leave(socket, msg.unsubscribe);
      } catch {
        socket.send(json({ type: "error", error: "BAD_MESSAGE" }));
      }
    });
    socket.on("close", () => rooms.leave(socket));
  });

  let priceTimer: ReturnType<typeof setInterval> | undefined;
  if ((deps.priceTickMs ?? 1_000) > 0) {
    priceTimer = setInterval(() => {
      if (!rooms.size("prices")) return;
      const ticks = COINS.flatMap((coin) => {
        const t = book.latest(coin);
        return t ? [{ coin, price: t.price, expo: t.expo, publishTime: t.publishTime }] : [];
      });
      rooms.broadcast("prices", { type: "prices", ticks });
    }, deps.priceTickMs ?? 1_000);
  }
  app.addHook("onClose", async () => clearInterval(priceTimer));

  /** Engine listener: pushes table events to `table:<id>`. */
  const onEngineEvent = (tableId: number, event: EngineEvent) => rooms.broadcast(`table:${tableId}`, event);

  return { app, rooms, onEngineEvent };
}
