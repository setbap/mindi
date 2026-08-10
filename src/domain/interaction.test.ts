import { describe, expect, it } from "vitest";
import { createInitialInteraction, reduceInteraction } from "./interaction";
import { createUntitledMap } from "./forest";

describe("Focused and Editing interaction", () => {
  it("keeps exactly one Focused Node distinct from Editing", () => {
    const map = createUntitledMap("map-1");
    const snapshot = createInitialInteraction(map);

    expect(snapshot.mode).toEqual({
      kind: "focused",
      focusedId: map.rootIds[0],
    });

    const editing = reduceInteraction(snapshot, { type: "startEditing" });
    expect(editing.mode.kind).toBe("editing");
    expect(editing.mode.focusedId).toBe(map.rootIds[0]);
  });

  it("Enter while Focused creates a sibling below and stays Focused", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const snapshot = createInitialInteraction(map);

    const next = reduceInteraction(snapshot, { type: "createSibling" });

    expect(next.mode.kind).toBe("focused");
    expect(next.map.rootIds).toHaveLength(2);
    expect(next.map.rootIds[0]).toBe(rootId);
    expect(next.mode.focusedId).toBe(next.map.rootIds[1]);
    expect(next.dirty).toBe(true);
  });

  it("Tab while Focused creates a child and stays Focused for rapid chaining", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    let snapshot = createInitialInteraction(map);

    snapshot = reduceInteraction(snapshot, { type: "createChild" });
    expect(snapshot.mode.kind).toBe("focused");
    const child1 = snapshot.mode.focusedId;
    expect(snapshot.map.nodes[rootId].childIds).toEqual([child1]);

    snapshot = reduceInteraction(snapshot, { type: "createChild" });
    expect(snapshot.mode.kind).toBe("focused");
    const child2 = snapshot.mode.focusedId;
    expect(snapshot.map.nodes[child1].childIds).toEqual([child2]);
    expect(snapshot.dirty).toBe(true);
  });

  it("typing while Focused enters Editing with that character", () => {
    const map = createUntitledMap("map-1");
    const snapshot = createInitialInteraction(map);

    const next = reduceInteraction(snapshot, {
      type: "typeCharacter",
      value: "H",
    });

    expect(next.mode).toMatchObject({
      kind: "editing",
      draft: "H",
    });
  });

  it("startEditing while Focused opens an empty draft without inserting text", () => {
    const map = createUntitledMap("map-1");
    const snapshot = createInitialInteraction(map);

    const next = reduceInteraction(snapshot, { type: "startEditing" });

    expect(next.mode).toEqual({
      kind: "editing",
      focusedId: map.rootIds[0],
      draft: "",
    });
  });

  it("Enter while Editing commits markdown and returns to Focused", () => {
    const map = createUntitledMap("map-1");
    let snapshot = createInitialInteraction(map);
    snapshot = reduceInteraction(snapshot, { type: "startEditing" });
    snapshot = reduceInteraction(snapshot, {
      type: "setDraft",
      value: "Notes",
    });

    const next = reduceInteraction(snapshot, { type: "commit" });

    expect(next.mode.kind).toBe("focused");
    expect(next.map.nodes[map.rootIds[0]].markdown).toBe("Notes");
    expect(next.dirty).toBe(true);
  });

  it("Escape while Editing discards the draft", () => {
    const map = createUntitledMap("map-1");
    let snapshot = createInitialInteraction(map);
    snapshot = reduceInteraction(snapshot, {
      type: "typeCharacter",
      value: "X",
    });

    const next = reduceInteraction(snapshot, { type: "cancel" });

    expect(next.mode.kind).toBe("focused");
    expect(next.map.nodes[map.rootIds[0]].markdown).toBe("");
    expect(next.dirty).toBe(false);
  });

  it("Tab while Editing inserts indentation", () => {
    const map = createUntitledMap("map-1");
    let snapshot = createInitialInteraction(map);
    snapshot = reduceInteraction(snapshot, { type: "startEditing" });

    const next = reduceInteraction(snapshot, { type: "insertIndent" });

    expect(next.mode).toMatchObject({ kind: "editing", draft: "  " });
  });

  it("arrow navigation moves Focused among siblings and parent/child", () => {
    const map = createUntitledMap("map-1");
    let snapshot = createInitialInteraction(map);
    snapshot = reduceInteraction(snapshot, { type: "createChild" });
    const childId = snapshot.mode.focusedId;

    snapshot = reduceInteraction(snapshot, {
      type: "arrow",
      direction: "left",
    });
    expect(snapshot.mode.focusedId).toBe(map.rootIds[0]);

    snapshot = reduceInteraction(snapshot, {
      type: "arrow",
      direction: "right",
    });
    expect(snapshot.mode.focusedId).toBe(childId);
  });

  it("createRoot appends a Root and keeps Focused mode", () => {
    const map = createUntitledMap("map-1");
    const snapshot = createInitialInteraction(map);
    const next = reduceInteraction(snapshot, { type: "createRoot" });
    expect(next.map.rootIds).toHaveLength(2);
    expect(next.mode).toEqual({
      kind: "focused",
      focusedId: next.map.rootIds[1],
    });
    expect(next.dirty).toBe(true);
  });

  it("moveDown then detach preserve focus on the moved Node", () => {
    const map = createUntitledMap("map-1");
    let snapshot = createInitialInteraction(map);
    snapshot = reduceInteraction(snapshot, { type: "createChild" });
    const childId = snapshot.mode.focusedId;

    snapshot = reduceInteraction(snapshot, { type: "createSibling" });
    snapshot = reduceInteraction(snapshot, {
      type: "focus",
      nodeId: childId,
    });
    snapshot = reduceInteraction(snapshot, { type: "moveDown" });
    expect(snapshot.map.nodes[map.rootIds[0]].childIds[1]).toBe(childId);

    snapshot = reduceInteraction(snapshot, { type: "detach" });
    expect(snapshot.map.rootIds).toContain(childId);
    expect(snapshot.mode.focusedId).toBe(childId);
    expect(snapshot.dirty).toBe(true);
  });
});
