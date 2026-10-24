// Sign-In with Ethereum: nonce → signed message → bearer session token (24 h).
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { verifyMessage } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import type { Db } from "../db/client.js";
import { sessions, siweNonces } from "../db/schema.js";

const NONCE_TTL_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 24 * 60 * 60;

export class AuthError extends Error {}

export class Auth {
  constructor(
    private readonly db: Db,
    private readonly domain: string,
    private readonly chainId: number,
    private readonly nowSeconds: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  async nonce(): Promise<string> {
    const nonce = generateSiweNonce();
    await this.db.insert(siweNonces).values({ nonce, createdAt: this.nowSeconds() });
    return nonce;
  }

  async verify(message: string, signature: `0x${string}`): Promise<{ token: string; address: string; expiresAt: number }> {
    const parsed = parseSiweMessage(message);
    if (!parsed.address || !parsed.nonce) throw new AuthError("malformed SIWE message");
    if (parsed.chainId !== this.chainId) throw new AuthError("wrong chain");
    const now = this.nowSeconds();
    if (!validateSiweMessage({ message: parsed, domain: this.domain, time: new Date(now * 1000) })) {
      throw new AuthError("SIWE message is not valid for this domain or time");
    }
    const [row] = await this.db
      .select()
      .from(siweNonces)
      .where(and(eq(siweNonces.nonce, parsed.nonce), eq(siweNonces.used, false), gt(siweNonces.createdAt, now - NONCE_TTL_SECONDS)));
    if (!row) throw new AuthError("unknown, used or expired nonce");
    if (!(await verifyMessage({ address: parsed.address, message, signature }))) throw new AuthError("bad signature");

    await this.db.update(siweNonces).set({ used: true }).where(eq(siweNonces.nonce, parsed.nonce));
    const token = randomBytes(32).toString("hex");
    const address = parsed.address.toLowerCase();
    const expiresAt = now + SESSION_TTL_SECONDS;
    await this.db.insert(sessions).values({ token, address, expiresAt });
    return { token, address, expiresAt };
  }

  /** The signed-in address for a bearer token, or null. */
  async session(token: string | undefined): Promise<string | null> {
    if (!token) return null;
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, this.nowSeconds())));
    return row?.address ?? null;
  }
}
