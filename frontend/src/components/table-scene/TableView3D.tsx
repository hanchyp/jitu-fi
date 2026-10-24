"use client";

// <TableView3D>: the 3D coin-spirits board driven by demo or server state.
// Fills its parent. Without WebGL, under reduced motion, or if the scene crashes it draws
// `fallback` (Jeki's 2D board) or nothing. See INTEGRATION.md.

import { useMemo, type ReactNode } from "react";
import type { DemoState } from "@/components/table/demo-engine";
import { fromDemoState } from "./adapter";
import { fromTableState, type ServerSceneOptions } from "./adapter-server";
import type { ServerTableState } from "./server-types";
import { TableScene } from "./TableScene";

type Props = { fallback?: ReactNode; className?: string } & (
  | { source?: "demo"; state: DemoState }
  | { source: "server"; state: ServerTableState; options?: ServerSceneOptions }
);

export function TableView3D(props: Props) {
  const { fallback = null, className = "" } = props;
  const options = props.source === "server" ? props.options : undefined;
  const scene = useMemo(() => props.source === "server"
    ? fromTableState(props.state, options)
    : fromDemoState(props.state), [props.source, props.state, options]);
  return <TableScene {...scene} fallback={fallback} className={`h-full w-full min-h-0! ${className}`} />;
}
