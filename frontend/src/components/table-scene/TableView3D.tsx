"use client";

// <TableView3D>: the 3D coin-spirits board for Jeki's demo table, driven by its DemoState.
// Fills its parent. Without WebGL, under reduced motion, or if the scene crashes it draws
// `fallback` (Jeki's 2D board) or nothing. See INTEGRATION.md.

import { useMemo, type ReactNode } from "react";
import type { DemoState } from "@/components/table/demo-engine";
import { fromDemoState } from "./adapter";
import { TableScene } from "./TableScene";

export function TableView3D({ state, fallback = null, className = "" }: { state: DemoState; fallback?: ReactNode; className?: string }) {
  const props = useMemo(() => fromDemoState(state), [state]);
  return <TableScene {...props} fallback={fallback} className={`h-full w-full min-h-0! ${className}`} />;
}
