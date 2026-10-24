type ShortcutEvent = Pick<KeyboardEvent, "key" | "repeat" | "ctrlKey" | "metaKey" | "altKey"> & { target: EventTarget | null };
type Root = { querySelector(selector: string): unknown };

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const MODAL = "dialog[open], [aria-modal='true']";

// Dev demo only: N advances one phase unless typing, a modifier combo, key repeat or an open dialog owns the key.
export function isNextPhaseKey(event: ShortcutEvent, root: Root) {
  if (event.key.toLowerCase() !== "n" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target as { closest?: (selector: string) => unknown; isContentEditable?: boolean } | null;
  if (target?.isContentEditable || target?.closest?.(EDITABLE)) return false;
  return !root.querySelector(MODAL);
}
