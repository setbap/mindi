import { describe, expect, it } from "vitest";

import { createUntitledMap } from "./forest";
import {
  canRedo,
  canUndo,
  clearHistory,
  createHistory,
  pushCommand,
  redo,
  undo,
  UNDO_LIMIT,
} from "./undo-history";
import { setNodeWidth } from "./resize";
import { createRoot } from "./structure";
import type { MapRecord } from "./types";
import { commitNodeMarkdown } from "./structure";

function withFocus(map: MapRecord, focusedId: string) {
  return { map, focusedId };
}

describe("per-Map Undo/Redo", () => {
  it("undoes and redoes a completed Map command", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    let history = createHistory();
    const before = withFocus(map, rootId);
    history = pushCommand(history, before);

    const afterMap = commitNodeMarkdown(map, rootId, "Hello");
    const after = withFocus(afterMap, rootId);
    history = pushCommand(history, after);

    expect(canUndo(history)).toBe(true);
    const undone = undo(history);
    expect(undone.entry.map.nodes[rootId].markdown).toBe("");
    history = undone.history;
    expect(canRedo(history)).toBe(true);

    const redone = redo(history);
    expect(redone.entry.map.nodes[rootId].markdown).toBe("Hello");
  });

  it("clears Redo when a new command is pushed after Undo", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    let history = createHistory();
    history = pushCommand(history, withFocus(map, rootId));
    history = pushCommand(
      history,
      withFocus(commitNodeMarkdown(map, rootId, "A"), rootId),
    );
    history = undo(history).history;
    history = pushCommand(
      history,
      withFocus(setNodeWidth(map, rootId, 320), rootId),
    );
    expect(canRedo(history)).toBe(false);
  });

  it("keeps only the latest 100 commands and clears on Map close", () => {
    expect(UNDO_LIMIT).toBe(100);
    let history = createHistory();
    let map = createUntitledMap("map-1");
    let focusedId = map.rootIds[0];
    history = pushCommand(history, withFocus(map, focusedId));

    for (let i = 0; i < 105; i++) {
      const created = createRoot(map);
      map = created.map;
      focusedId = created.focusedId;
      history = pushCommand(history, withFocus(map, focusedId));
    }

    expect(history.past.length).toBeLessThanOrEqual(UNDO_LIMIT);

    history = clearHistory();
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});
