import { describe, expect, it } from "vitest";

import { createLastChild, createSiblingBelow } from "@/domain/structure";
import { createUntitledMap } from "@/domain/forest";
import type { MapRecord } from "@/domain/types";
import {
  hasPositiveAreaOverlap,
  layoutMap,
  NODE_SEP,
  RANK_SEP,
} from "./layout-map";

function withMarkdown(map: MapRecord, nodeId: string, markdown: string): MapRecord {
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: { ...map.nodes[nodeId], markdown },
    },
  };
}

function sizesFor(
  map: MapRecord,
  overrides: Record<string, { width: number; height: number }> = {},
): Record<string, { width: number; height: number }> {
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const node of Object.values(map.nodes)) {
    sizes[node.id] = overrides[node.id] ?? {
      width: node.width,
      height: 48,
    };
  }
  return sizes;
}

describe("layoutMap", () => {
  it("places a child to the right of its parent (left-to-right)", () => {
    let map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const created = createLastChild(map, rootId);
    map = withMarkdown(created.map, rootId, "Parent");
    map = withMarkdown(map, created.newNodeId, "Child");

    const layout = layoutMap(map, sizesFor(map));
    const parent = layout.nodes.find((n) => n.id === rootId)!;
    const child = layout.nodes.find((n) => n.id === created.newNodeId)!;

    expect(child.x).toBeGreaterThan(parent.x + parent.width);
    expect(layout.edges).toEqual([
      { parentId: rootId, childId: created.newNodeId },
    ]);
  });

  it("lays out a multi-Root forest without positive-area overlap", () => {
    let map = createUntitledMap("map-1");
    const rootA = map.rootIds[0];
    const sibling = createSiblingBelow(map, rootA);
    map = sibling.map;
    const rootB = sibling.newNodeId;

    const childA = createLastChild(map, rootA);
    map = childA.map;
    const childB = createLastChild(map, rootB);
    map = childB.map;

    const layout = layoutMap(
      map,
      sizesFor(map, {
        [rootA]: { width: 280, height: 60 },
        [rootB]: { width: 180, height: 90 },
        [childA.newNodeId]: { width: 320, height: 48 },
        [childB.newNodeId]: { width: 200, height: 70 },
      }),
    );

    expect(layout.nodes).toHaveLength(4);
    expect(hasPositiveAreaOverlap(layout.nodes)).toBe(false);
    expect(layout.edges).toHaveLength(2);
  });

  it("places earlier siblings above later siblings (matching Node browser order)", () => {
    let map = createUntitledMap("map-1");
    const first = map.rootIds[0];
    map = withMarkdown(map, first, "1");

    const second = createSiblingBelow(map, first);
    map = withMarkdown(second.map, second.newNodeId, "2");
    const third = createSiblingBelow(map, second.newNodeId);
    map = withMarkdown(third.map, third.newNodeId, "3");

    const layout = layoutMap(map, sizesFor(map));
    const a = layout.nodes.find((n) => n.id === first)!;
    const b = layout.nodes.find((n) => n.id === second.newNodeId)!;
    const c = layout.nodes.find((n) => n.id === third.newNodeId)!;

    expect(map.rootIds).toEqual([first, second.newNodeId, third.newNodeId]);
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
  });

  it("places earlier children above later children under the same parent", () => {
    let map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    map = withMarkdown(map, rootId, "Root");

    const child1 = createLastChild(map, rootId);
    map = withMarkdown(child1.map, child1.newNodeId, "A");
    const child2 = createLastChild(map, rootId);
    map = withMarkdown(child2.map, child2.newNodeId, "B");

    const layout = layoutMap(map, sizesFor(map));
    const a = layout.nodes.find((n) => n.id === child1.newNodeId)!;
    const b = layout.nodes.find((n) => n.id === child2.newNodeId)!;

    expect(map.nodes[rootId].childIds).toEqual([
      child1.newNodeId,
      child2.newNodeId,
    ]);
    expect(a.y).toBeLessThan(b.y);
  });

  it("uses 64px rank spacing and 32px sibling spacing constants", () => {
    expect(RANK_SEP).toBe(64);
    expect(NODE_SEP).toBe(32);
  });
});
