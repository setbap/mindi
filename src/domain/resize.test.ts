import { describe, expect, it } from "vitest";

import { createUntitledMap } from "./forest";
import {
  clampNodeWidth,
  MAX_NODE_WIDTH,
  MIN_NODE_WIDTH,
  resetNodeWidth,
  setNodeWidth,
} from "./resize";
import { DEFAULT_NODE_WIDTH } from "./types";

describe("Node resize", () => {
  it("clamps width to 180–480 inclusive", () => {
    expect(clampNodeWidth(100)).toBe(MIN_NODE_WIDTH);
    expect(clampNodeWidth(500)).toBe(MAX_NODE_WIDTH);
    expect(clampNodeWidth(300)).toBe(300);
    expect(MIN_NODE_WIDTH).toBe(180);
    expect(MAX_NODE_WIDTH).toBe(480);
  });

  it("persists a clamped width on the Node", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const next = setNodeWidth(map, rootId, 600);
    expect(next.nodes[rootId].width).toBe(MAX_NODE_WIDTH);
  });

  it("resets width to the default 280px", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const wide = setNodeWidth(map, rootId, 400);
    const reset = resetNodeWidth(wide, rootId);
    expect(reset.nodes[rootId].width).toBe(DEFAULT_NODE_WIDTH);
  });
});
