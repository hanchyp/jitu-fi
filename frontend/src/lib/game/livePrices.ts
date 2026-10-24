"use client";

import { useSyncExternalStore } from "react";
import { WS_URL } from "./config";

export type LiveTick = { coin: string; price: string; expo: number; publishTime: number };
export type PriceSample = LiveTick & { time: number };
export type LivePrices = { prices: Record<string, LiveTick>; history: Record<string, PriceSample[]>; connected: boolean };

/** Feed prices are integer decimal strings, scaled by expo (never parsed through float). */
export function priceMicros(tick: LiveTick): bigint {
  const shift = tick.expo + 6;
  return shift >= 0 ? BigInt(tick.price) * BigInt(10) ** BigInt(shift) : BigInt(tick.price) / BigInt(10) ** BigInt(-shift);
}
export function priceNumber(tick: LiveTick): number { return Number(tick.price) * 10 ** tick.expo; }
export function priceMove(start: LiveTick, current: LiveTick): number {
  const expo = Math.min(start.expo, current.expo);
  const a = BigInt(start.price) * BigInt(10) ** BigInt(start.expo - expo);
  const b = BigInt(current.price) * BigInt(10) ** BigInt(current.expo - expo);
  return a > BigInt(0) ? Number((b - a) * BigInt(10_000) / a) : 0;
}

const empty: LivePrices = { prices: {}, history: {}, connected: false };
let snapshot = empty;
const listeners = new Set<() => void>();
let socket: WebSocket | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let attempts = 0;
function emit(next: LivePrices) { snapshot = next; listeners.forEach((listener) => listener()); }
function connect() {
  if (socket || !listeners.size) return;
  const ws = socket = new WebSocket(WS_URL);
  ws.onopen = () => { if (socket !== ws) return; attempts = 0; ws.send(JSON.stringify({ subscribe: "prices" })); emit({ ...snapshot, connected: true }); };
  ws.onmessage = (event) => {
    if (socket !== ws) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message || message.type !== "prices" || !Array.isArray(message.ticks)) return;
    const prices = { ...snapshot.prices }, history = { ...snapshot.history };
    const now = Date.now();
    for (const tick of message.ticks) {
      if (!tick || typeof tick.coin !== "string" || typeof tick.price !== "string" || !/^\d+$/.test(tick.price) || !Number.isInteger(tick.expo) || Math.abs(tick.expo) > 30 || !Number.isFinite(tick.publishTime) || BigInt(tick.price) <= BigInt(0)) continue;
      if (prices[tick.coin]?.publishTime > tick.publishTime) continue;
      prices[tick.coin] = tick;
      const samples = (history[tick.coin] ?? []).filter((sample) => sample.time >= now - 15 * 60_000);
      if (!samples.length || now - samples[samples.length - 1].time >= 1000) samples.push({ ...tick, time: now });
      history[tick.coin] = samples;
    }
    emit({ prices, history, connected: true });
  };
  ws.onerror = () => ws.close();
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = undefined;
    emit({ ...snapshot, connected: false });
    if (listeners.size) retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15_000));
  };
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(retry);
      const previous = socket; socket = undefined; previous?.close();
      snapshot = empty; attempts = 0;
    }
  };
}
export function useLivePrices(): LivePrices { return useSyncExternalStore(subscribe, () => snapshot, () => empty); }
