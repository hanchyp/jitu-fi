"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "motion/react";
import { COINS } from "@/mocks/table";
import { coinDataUrl } from "@/lib/coins";
import type { DemoState } from "./demo-engine";

type CardSnapshot = { symbol: string; direction: string; rect: DOMRect; owner: string };
type Snapshot = { round: number; phase: DemoState["phase"]; cards: CardSnapshot[] };

export function useHandMotion(host: RefObject<HTMLElement | null>, state: DemoState) {
  const previous = useRef<Snapshot | null>(null);
  const active = useRef(new Set<() => void>());
  const reduced = useReducedMotion();

  useEffect(() => {
    const jobs = active.current;
    return () => { jobs.forEach((stop) => stop()); jobs.clear(); };
  }, []);

  useLayoutEffect(() => {
    const root = host.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-hand-coin]")).map((card): CardSnapshot => ({
      symbol: card.dataset.handCoin!, direction: card.dataset.handDirection!, rect: card.getBoundingClientRect(), owner: card.closest<HTMLElement>("[data-hand-owner]")!.dataset.handOwner!,
    }));
    const before = previous.current;
    previous.current = { round: state.round, phase: state.phase, cards };
    if (!before || reduced) return;

    function fly(card: CardSnapshot, from: DOMRect, to: DOMRect, returning: boolean, destination?: HTMLElement, delay = 0) {
      const coin = COINS.find((item) => item.symbol === card.symbol);
      if (!coin) return;
      const node = document.createElement("div");
      node.className = "jitu-hand-flight";
      node.setAttribute("aria-hidden", "true");
      node.dataset.direction = card.direction;
      const icon = document.createElement("img");
      icon.src = coinDataUrl(coin);
      icon.alt = "";
      const label = document.createElement("span");
      label.textContent = card.direction;
      const name = document.createElement("strong");
      name.textContent = card.symbol;
      const sculptedCoin = root!.querySelector<HTMLElement>(`[data-market-coin="${card.symbol}"] .jitu-coin3d`)?.cloneNode(true);
      node.append(sculptedCoin ?? icon, name, label);
      const startX = from.left + from.width / 2 - 24;
      const startY = from.top + from.height / 2 - 30;
      const endX = to.left + to.width / 2 - 24;
      const endY = to.top + to.height / 2 - 30;
      root!.append(node);
      if (destination) destination.dataset.arriving = "true";
      const smooth = (t: number) => t * t * (3 - 2 * t);
      // Sample a continuous curved path, with zero velocity at lift and landing.
      // The first quarter separates the duplicate from the coin left on the table.
      const frames: Keyframe[] = Array.from({ length: 61 }, (_, index) => {
        const p = index / 60;
        const departing = !returning && p < .24;
        const t = smooth(returning ? p : Math.max(0, (p - .24) / .76));
        const split = smooth(Math.min(1, p / .24));
        const fromX = startX + (returning ? 0 : 24);
        const fromY = startY - (returning ? 0 : 22);
        const x = departing ? startX + split * 24 : fromX + (endX - fromX) * t + Math.sin(t * Math.PI) * 24;
        const y = departing ? startY - split * 22 : fromY + (endY - fromY) * t - Math.sin(t * Math.PI) * (returning ? 45 : 60);
        const scale = departing ? .85 + split * .22 : 1.07 + (Math.min(1, to.width / 36) - 1.07) * t;
        const yaw = departing ? -30 * split : Math.sin(t * Math.PI) * 35 - 30 * (1 - t);
        const pitch = Math.sin(t * Math.PI) * 18;
        return { offset: p, transform: `perspective(900px) translate3d(${x}px, ${y}px, 0) scale(${scale}) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${Math.sin(t * Math.PI) * -8}deg)`, opacity: returning ? p > .78 ? (1 - p) / .22 : 1 : Math.min(1, p / .1) };
      });
      const animation = node.animate(frames, { duration: returning ? 820 : 1150, delay, easing: "linear", fill: "both" });
      const clean = () => { node.remove(); if (destination) delete destination.dataset.arriving; active.current.delete(stop); };
      const stop = () => { animation.cancel(); clean(); };
      active.current.add(stop);
      void animation.finished.then(() => {
        clean();
        destination?.querySelector(".jitu-coin3dRotor")?.animate([{ transform: "rotateX(10deg) scale(.94)" }, { transform: "rotateX(-4deg) scale(1.05)", offset: .55 }, { transform: "rotateX(0) scale(1)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
      }, clean);
    }

    const reset = before.round !== state.round || (state.phase === "commit" && before.phase !== "commit");
    if (reset) {
      before.cards.forEach((card, index) => {
        const target = root.querySelector<HTMLElement>(`[data-market-coin="${card.symbol}"]`);
        if (target) fly(card, card.rect, (target.querySelector("img") ?? target).getBoundingClientRect(), true, undefined, index * 35);
      });
      return;
    }
    const priorHuman = before.cards.filter((card) => card.owner === "you");
    if (state.phase === "commit") {
      cards.filter((card) => card.owner === "you").forEach((card) => {
        const old = priorHuman.find((item) => item.symbol === card.symbol);
        const destination = root.querySelector<HTMLElement>(`[data-hand-owner="you"] [data-hand-coin="${card.symbol}"]`);
        if (!old) {
          const source = root.querySelector<HTMLElement>(`[data-market-coin="${card.symbol}"]`);
          if (source && destination) {
            source.querySelector(".jitu-coin3d")?.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-5px) scale(1.16)", offset: .4 }, { transform: "translateY(0) scale(1)" }], { duration: 760, easing: "cubic-bezier(.22,1,.36,1)" });
            fly(card, (source.querySelector("img") ?? source).getBoundingClientRect(), card.rect, false, destination);
          }
        } else if (old.direction !== card.direction) {
          destination?.querySelector(".jitu-coin3dRotor")?.animate([{ transform: "rotateY(0) rotateX(0)" }, { transform: "rotateY(180deg) rotateX(12deg)", offset: .5 }, { transform: "rotateY(360deg) rotateX(0)" }], { duration: 800, easing: "cubic-bezier(.22,1,.36,1)" });
        }
      });
      priorHuman.filter((old) => !cards.some((card) => card.owner === "you" && card.symbol === old.symbol)).forEach((card) => {
        const target = root.querySelector<HTMLElement>(`[data-market-coin="${card.symbol}"]`);
        if (target) fly(card, card.rect, (target.querySelector("img") ?? target).getBoundingClientRect(), true);
      });
    }
  }, [host, reduced, state]);
}
