import { describe, expect, it } from "vitest";

import { createUntitledMap } from "./forest";
import { setNodeColorSlot } from "./palette";
import {
  canDeleteNode,
  canDetach,
  canMoveDown,
  canMoveUp,
  canSwapWithParent,
  commitNodeMarkdown,
  createLastChild,
  createRoot,
  createSiblingBelow,
  deleteNodeRecursive,
  detachNode,
  descendantCount,
  eligibleMoveUnderTargets,
  focusAfterDelete,
  initialFocusedId,
  moveDown,
  moveUnder,
  moveUp,
  swapWithParent,
} from "./structure";
import type { MapRecord } from "./types";

function label(map: MapRecord, id: string, markdown: string): MapRecord {
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [id]: { ...map.nodes[id], markdown },
    },
  };
}

/** Build A → B → C (and sibling D under A) for structure fixtures. */
function sampleForest(): {
  map: MapRecord;
  a: string;
  b: string;
  c: string;
  d: string;
} {
  let map = createUntitledMap("map-1");
  const a = map.rootIds[0];
  map = label(map, a, "A");

  const childB = createLastChild(map, a);
  map = label(childB.map, childB.newNodeId, "B");
  const b = childB.newNodeId;

  const childC = createLastChild(map, b);
  map = label(childC.map, childC.newNodeId, "C");
  const c = childC.newNodeId;

  const siblingD = createSiblingBelow(map, b);
  map = label(siblingD.map, siblingD.newNodeId, "D");
  const d = siblingD.newNodeId;

  return { map, a, b, c, d };
}

describe("createRoot", () => {
  it("appends an empty Root and returns it as focused", () => {
    const map = createUntitledMap("map-1");
    const first = map.rootIds[0];
    const { map: next, focusedId } = createRoot(map);

    expect(next.rootIds).toEqual([first, focusedId]);
    expect(next.nodes[focusedId]).toMatchObject({
      markdown: "",
      parentId: null,
      childIds: [],
    });
  });
});

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

  it("inherits Color slot when creating a sibling or child", () => {
    let map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    map = setNodeColorSlot(map, rootId, 4);

    const sibling = createSiblingBelow(map, rootId);
    expect(sibling.map.nodes[sibling.newNodeId].colorSlot).toBe(4);

    const child = createLastChild(sibling.map, rootId);
    expect(child.map.nodes[child.newNodeId].colorSlot).toBe(4);

    const rooted = createRoot(sibling.map, 4);
    expect(rooted.map.nodes[rooted.focusedId].colorSlot).toBe(4);
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

describe("move up / move down", () => {
  it("moves a sibling one place and respects boundaries", () => {
    const { map, a, b, d } = sampleForest();
    // A children: B, D
    expect(canMoveUp(map, b)).toBe(false);
    expect(canMoveDown(map, b)).toBe(true);
    expect(canMoveUp(map, d)).toBe(true);
    expect(canMoveDown(map, d)).toBe(false);

    const down = moveDown(map, b);
    expect(down.map.nodes[a].childIds).toEqual([d, b]);
    expect(down.focusedId).toBe(b);

    const up = moveUp(down.map, b);
    expect(up.map.nodes[a].childIds).toEqual([b, d]);
    expect(up.focusedId).toBe(b);
  });

  it("moves Roots within Root order", () => {
    let map = createUntitledMap("map-1");
    const first = map.rootIds[0];
    const created = createRoot(map);
    map = created.map;
    const second = created.focusedId;

    expect(canMoveUp(map, first)).toBe(false);
    const moved = moveDown(map, first);
    expect(moved.map.rootIds).toEqual([second, first]);
    expect(moved.focusedId).toBe(first);
  });
});

describe("move under", () => {
  it("makes the Node the target's last child and excludes self/descendants", () => {
    const { map, a, b, c, d } = sampleForest();
    const targets = eligibleMoveUnderTargets(map, b);
    expect(targets).toEqual([a, d]);
    expect(targets).not.toContain(b);
    expect(targets).not.toContain(c);

    const moved = moveUnder(map, b, d);
    expect(moved.map.nodes[d].childIds).toContain(b);
    expect(moved.map.nodes[a].childIds).toEqual([d]);
    expect(moved.map.nodes[b].parentId).toBe(d);
    expect(moved.focusedId).toBe(b);
  });

  it("can move a Root under another tree", () => {
    let map = createUntitledMap("map-1");
    const first = map.rootIds[0];
    const created = createRoot(map);
    map = created.map;
    const second = created.focusedId;

    const moved = moveUnder(map, second, first);
    expect(moved.map.rootIds).toEqual([first]);
    expect(moved.map.nodes[first].childIds).toContain(second);
    expect(moved.map.nodes[second].parentId).toBe(first);
  });
});

describe("swap with parent", () => {
  it("is unavailable for a Root and swaps child into parent's place", () => {
    const { map, a, b, c, d } = sampleForest();
    expect(canSwapWithParent(map, a)).toBe(false);
    expect(canSwapWithParent(map, b)).toBe(true);

    const swapped = swapWithParent(map, b);
    // B takes A's place in Root order; A becomes B's last child
    expect(swapped.map.rootIds).toEqual([b]);
    expect(swapped.map.nodes[b].parentId).toBeNull();
    expect(swapped.map.nodes[a].parentId).toBe(b);
    expect(swapped.map.nodes[b].childIds.at(-1)).toBe(a);
    // Former siblings of B (D) stay under A
    expect(swapped.map.nodes[a].childIds).toEqual([d]);
    expect(swapped.map.nodes[b].childIds).toEqual([c, a]);
    expect(swapped.focusedId).toBe(b);
  });
});

describe("detach", () => {
  it("is unavailable for a Root and appends the subtree as a new Root", () => {
    const { map, a, b, c } = sampleForest();
    expect(canDetach(map, a)).toBe(false);
    expect(canDetach(map, b)).toBe(true);

    const detached = detachNode(map, b);
    expect(detached.map.rootIds).toEqual([a, b]);
    expect(detached.map.nodes[a].childIds).not.toContain(b);
    expect(detached.map.nodes[b].parentId).toBeNull();
    expect(detached.map.nodes[b].childIds).toContain(c);
    expect(detached.focusedId).toBe(b);
  });
});

describe("delete recursive", () => {
  it("blocks deleting the final Node or a sole-Root subtree that would empty the Map", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    expect(canDeleteNode(map, rootId)).toBe(false);

    const withChild = createLastChild(map, rootId);
    expect(canDeleteNode(withChild.map, rootId)).toBe(false);
    expect(canDeleteNode(withChild.map, withChild.newNodeId)).toBe(true);
  });

  it("deletes a leaf immediately and focuses the next sibling", () => {
    const { map, a, b, d } = sampleForest();
    expect(descendantCount(map, d)).toBe(0);
    expect(canDeleteNode(map, d)).toBe(true);

    const deleted = deleteNodeRecursive(map, d);
    expect(deleted.map.nodes[d]).toBeUndefined();
    expect(deleted.map.nodes[a].childIds).toEqual([b]);
    expect(deleted.focusedId).toBe(focusAfterDelete(map, d));
    expect(deleted.focusedId).toBe(b);
  });

  it("deletes a subtree and focuses next sibling, else previous, else parent", () => {
    const { map, a, b, c, d } = sampleForest();
    expect(descendantCount(map, b)).toBe(1);
    expect(focusAfterDelete(map, b)).toBe(d);

    const deleted = deleteNodeRecursive(map, b);
    expect(deleted.map.nodes[b]).toBeUndefined();
    expect(deleted.map.nodes[c]).toBeUndefined();
    expect(deleted.map.nodes[a].childIds).toEqual([d]);
    expect(deleted.focusedId).toBe(d);

    const onlyChild = deleteNodeRecursive(deleted.map, d);
    expect(onlyChild.focusedId).toBe(a);
    expect(Object.keys(onlyChild.map.nodes)).toEqual([a]);
  });

  it("can delete a Root when other Nodes remain", () => {
    let map = createUntitledMap("map-1");
    const first = map.rootIds[0];
    const created = createRoot(map);
    map = created.map;
    const second = created.focusedId;

    expect(canDeleteNode(map, first)).toBe(true);
    const deleted = deleteNodeRecursive(map, first);
    expect(deleted.map.rootIds).toEqual([second]);
    expect(deleted.focusedId).toBe(second);
  });
});
