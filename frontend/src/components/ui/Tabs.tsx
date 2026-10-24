"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: string };

type TabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. "Season tenor". */
  label: string;
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** The active tab's panel. */
  children: ReactNode;
  className?: string;
};

/** Segmented tabs on a deep band; the active tab is a gold tile. Arrow keys move between tabs. */
export function Tabs<T extends string>({ label, tabs, value, onChange, children, className = "" }: TabsProps<T>) {
  const base = useId();
  const list = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    const to =
      e.key === "ArrowRight" ? (i + 1) % tabs.length
      : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-[16px] border-[3px] border-garis bg-dasar p-1"
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${base}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`font-display whitespace-nowrap rounded-[11px] border-[3px] px-3.5 py-1 text-lg transition-colors ${
                active ? "border-garis bg-emas text-garis" : "border-transparent text-white/75 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`} className="mt-4">
        {children}
      </div>
    </div>
  );
}
