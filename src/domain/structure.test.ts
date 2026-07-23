import { describe, expect, it } from "vitest";
import {
  commitNodeMarkdown,
  createLastChild,
  createSiblingBelow,
  initialFocusedId,
} from "./structure";
import { createUntitledMap } from "./forest";

describe("structure commands for Focused mode", () => {
  it("creates a sibling Root immediately below the Focused Root", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];

    const { map: next, newNodeId } = createSiblingBelow(map, rootId);

    expect(next.rootIds).toEqual([rootId, newNodeId]);
    expect(next.nodes[newNodeId]).toMatchObject({
      markdown: "",
      parentId: null,
      childIds: [],
    });
  });

  it("creates a last child under the Focused Node", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];

    const { map: next, newNodeId } = createLastChild(map, rootId);

    expect(next.rootIds).toEqual([rootId]);
    expect(next.nodes[rootId].childIds).toEqual([newNodeId]);
    expect(next.nodes[newNodeId].parentId).toBe(rootId);
  });

  it("commits Node markdown", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const next = commitNodeMarkdown(map, rootId, "Hello");
    expect(next.nodes[rootId].markdown).toBe("Hello");
  });

  it("starts Focused on the first Root", () => {
    const map = createUntitledMap("map-1");
    expect(initialFocusedId(map)).toBe(map.rootIds[0]);
  });
});
