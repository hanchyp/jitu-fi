"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchTable, serverNow } from "./api";
import { WS_URL } from "./config";
import { tableReducer } from "./reducer";
import type { EngineEvent, PriceJson, TableState } from "./types";

const EVENTS = new Set(["roundStarted", "picksSubmitted", "revealed", "liveStarted", "liveShortened", "skillUsed", "roundSettled", "gameFinished"]);
export function useTable(id: number) {
  const [state, setState] = useState<TableState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "notfound">("loading");
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceJson>>({});
  const [now, setNow] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const refetch = useCallback(() => setRefresh((n) => n + 1), []);
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let syncing = false;
    let queued: EngineEvent[] = [];
    async function sync() {
      if (syncing) return;
      syncing = true;
      queued = [];
      try {
        let snapshot = await fetchTable(id);
        if (disposed) return;
        for (const event of queued) snapshot = tableReducer(snapshot, event);
        setNow(serverNow()); setState(snapshot); setStatus("ready"); setError(null);
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : "Unable to load table");
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "error");
      } finally { syncing = false; queued = []; }
    }
    function connect() {
      if (disposed) return;
      socket = new WebSocket(WS_URL);
      socket.onopen = () => {
        attempts = 0;
        socket?.send(JSON.stringify({ subscribe: `table:${id}` }));
        socket?.send(JSON.stringify({ subscribe: "prices" }));
        void sync();
      };
      socket.onmessage = ({ data }) => {
        try {
          const message = JSON.parse(data);
          if (message.room === "prices" && message.type === "prices" && Array.isArray(message.ticks)) {
            setPrices((old) => ({ ...old, ...Object.fromEntries(message.ticks.map((tick: PriceJson & { coin: string }) => [tick.coin, { price: String(tick.price), expo: tick.expo, publishTime: tick.publishTime }])) }));
          } else if (message.room === `table:${id}` && EVENTS.has(message.type)) {
            if (syncing) queued.push(message as EngineEvent);
            else setState((old) => old ? tableReducer(old, message as EngineEvent) : old);
          }
        } catch { /* Ignore malformed or unrelated frames. Reconnect restores snapshot. */ }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (disposed) return;
        setError("Connection lost. Reconnecting…");
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000));
      };
    }
    void sync(); connect();
    const clock = setInterval(() => setNow(serverNow()), 200);
    return () => { disposed = true; clearTimeout(retry); clearInterval(clock); socket?.close(); };
  }, [id, refresh]);
  return { state, status, error, now, prices, refetch };
}
