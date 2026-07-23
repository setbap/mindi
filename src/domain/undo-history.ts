import type { MapRecord } from "./types";

export const UNDO_LIMIT = 100;

export interface HistoryEntry {
  map: MapRecord;
  focusedId: string;
}

export interface UndoHistory {
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];
}

export function createHistory(): UndoHistory {
  return { past: [], present: null, future: [] };
}

export function clearHistory(): UndoHistory {
  return createHistory();
}

export function canUndo(history: UndoHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: UndoHistory): boolean {
  return history.future.length > 0;
}

/**
 * Record a completed Map command. The first push seeds `present` without
 * undoable past; later pushes move the previous present into past.
 */
export function pushCommand(
  history: UndoHistory,
  entry: HistoryEntry,
): UndoHistory {
  if (!history.present) {
    return { past: [], present: cloneEntry(entry), future: [] };
  }

  const past = [...history.past, cloneEntry(history.present)];
  while (past.length > UNDO_LIMIT) {
    past.shift();
  }

  return {
    past,
    present: cloneEntry(entry),
    future: [],
  };
}

export function undo(
  history: UndoHistory,
): { history: UndoHistory; entry: HistoryEntry } {
  if (!history.present || history.past.length === 0) {
    throw new Error("Nothing to undo.");
  }
  const past = [...history.past];
  const previous = past.pop()!;
  return {
    entry: previous,
    history: {
      past,
      present: previous,
      future: [cloneEntry(history.present), ...history.future],
    },
  };
}

export function redo(
  history: UndoHistory,
): { history: UndoHistory; entry: HistoryEntry } {
  if (history.future.length === 0) {
    throw new Error("Nothing to redo.");
  }
  const [next, ...future] = history.future;
  const past = history.present
    ? [...history.past, cloneEntry(history.present)]
    : [...history.past];
  while (past.length > UNDO_LIMIT) {
    past.shift();
  }
  return {
    entry: next,
    history: {
      past,
      present: cloneEntry(next),
      future,
    },
  };
}

function cloneEntry(entry: HistoryEntry): HistoryEntry {
  return {
    map: structuredClone(entry.map),
    focusedId: entry.focusedId,
  };
}
