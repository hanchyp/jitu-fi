"use client";

// <TableScene>: the 3D coin-spirits table, or its flat fallback when WebGL is missing, the 3D
// scene crashes, or the user prefers reduced motion. Props only; see ./types.

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { Confetti } from "./Confetti";
import { TableScene2D } from "./TableScene2D";
import type { TableSceneProps } from "./types";

const TableScene3D = dynamic(() => import("./TableScene3D"), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  return <div className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_50%_60%,#1D4A6B_0%,#113048_45%,#071624_85%)]" />;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function TableScene({ view = "auto", className, ...data }: TableSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    // Feature detection has to run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
  }, []);

  const flat = <TableScene2D {...data} className={className} />;
  if (view === "2d" || webgl === false || (view === "auto" && reduce)) return flat;

  return (
    <div className={`relative isolate min-h-[420px] overflow-hidden ${className ?? ""}`}>
      {webgl === null ? (
        <Loading />
      ) : (
        <SceneBoundary fallback={flat}>
          <TableScene3D {...data} />
        </SceneBoundary>
      )}
      {data.celebrate && <Confetti />}
    </div>
  );
}
