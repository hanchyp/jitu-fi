type ShortcutEvent = Pick<KeyboardEvent, "key" | "repeat" | "ctrlKey" | "metaKey" | "altKey"> & Partial<Pick<KeyboardEvent, "shiftKey">> & { target: EventTarget | null };
type Root = { querySelector(selector: string): unknown };

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const MODAL = "dialog[open], [aria-modal='true']";

// A page shortcut fires unless typing, a modifier combo, key repeat or an open dialog owns the key.
function isShortcut(event: ShortcutEvent, root: Root, key: string) {
  if (event.key.toLowerCase() !== key || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target as { closest?: (selector: string) => unknown; isContentEditable?: boolean } | null;
  if (target?.isContentEditable || target?.closest?.(EDITABLE)) return false;
  return !root.querySelector(MODAL);
}

/** N: next phase (local demo, and the season-manager skip on a server table). */
export const isNextPhaseKey = (event: ShortcutEvent, root: Root) => !event.shiftKey && isShortcut(event, root, "n");

/** Shift+N on /table/[id]: leave at most five seconds of Live. */
export const isShortenLiveKey = (event: ShortcutEvent, root: Root) => Boolean(event.shiftKey) && isShortcut(event, root, "n");

/** Shift+R on /play: new testnet season (season managers only). */
export const isNewSeasonKey = (event: ShortcutEvent, root: Root) => Boolean(event.shiftKey) && isShortcut(event, root, "r");
