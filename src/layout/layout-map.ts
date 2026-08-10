import { Graph, layout } from "@dagrejs/dagre";

import type { MapRecord } from "@/domain/types";

/** Rank (depth) spacing in px — SPEC: 64px. */
export const RANK_SEP = 64;

/** Sibling / component spacing in px — SPEC: 32px. */
export const NODE_SEP = 32;
export const LAYOUT_PERFORMANCE_ENTRY = "mindi:layout";

export interface NodeSize {
  width: number;
  height: number;
}

export interface LayoutRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  parentId: string;
  childId: string;
}

export interface LayoutResult {
  nodes: LayoutRect[];
  edges: LayoutEdge[];
}

/** Forest traversal order: Roots in Root order, then each Node's children in Sibling order. */
function forestVisitOrder(map: MapRecord): string[] {
  const ids: string[] = [];
  const walk = (id: string) => {
    ids.push(id);
    const node = map.nodes[id];
    if (!node) {
      return;
    }
    for (const childId of node.childIds) {
      walk(childId);
    }
  };
  for (const rootId of map.rootIds) {
    walk(rootId);
  }
  return ids;
}

export function layoutMap(
  map: MapRecord,
  sizes: Record<string, NodeSize>,
): LayoutResult {
  const startedAt = performance.now();
  const g = new Graph({ multigraph: false, compound: false });
  g.setGraph({
    rankdir: "LR",
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    edgesep: NODE_SEP,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const edges: LayoutEdge[] = [];
  const visitOrder = forestVisitOrder(map);

  for (const id of visitOrder) {
    const node = map.nodes[id];
    const size = sizes[id] ?? { width: node.width, height: 48 };
    g.setNode(id, { width: size.width, height: size.height });
  }

  // Dagre LR lays out same-rank siblings in reverse edge-registration order.
  // Register children bottom-to-top so visual top-to-bottom matches Sibling order.
  for (const id of visitOrder) {
    const node = map.nodes[id];
    for (let i = node.childIds.length - 1; i >= 0; i--) {
      const childId = node.childIds[i];
      g.setEdge(id, childId);
      edges.push({ parentId: id, childId });
    }
  }
  // Keep exported edges in domain Sibling order for connectors/tests.
  edges.sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return visitOrder.indexOf(a.parentId) - visitOrder.indexOf(b.parentId);
    }
    const parent = map.nodes[a.parentId];
    return (
      parent.childIds.indexOf(a.childId) - parent.childIds.indexOf(b.childId)
    );
  });

  layout(g);

  let nodes: LayoutRect[] = visitOrder.map((id) => {
    const size = sizes[id] ?? { width: map.nodes[id].width, height: 48 };
    const positioned = g.node(id);
    return {
      id,
      x: positioned.x - size.width / 2,
      y: positioned.y - size.height / 2,
      width: size.width,
      height: size.height,
    };
  });

  nodes = enforceDomainVerticalOrder(map, nodes);

  if (hasPositiveAreaOverlap(nodes)) {
    throw new Error("Layout produced positive-area Node overlap.");
  }

  performance.measure(LAYOUT_PERFORMANCE_ENTRY, {
    start: startedAt,
    end: performance.now(),
  });
  return { nodes, edges };
}

/**
 * Dagre LR can invert same-rank order. Re-pack each sibling/Root group so
 * earlier domain order sits above later order (canvas matches Node browser).
 */
function enforceDomainVerticalOrder(
  map: MapRecord,
  rects: LayoutRect[],
): LayoutRect[] {
  const byId = new Map(rects.map((rect) => [rect.id, { ...rect }]));

  function subtreeIds(rootId: string): string[] {
    const ids: string[] = [];
    const walk = (id: string) => {
      ids.push(id);
      for (const childId of map.nodes[id]?.childIds ?? []) {
        walk(childId);
      }
    };
    walk(rootId);
    return ids;
  }

  function reorderGroup(orderedIds: readonly string[]) {
    if (orderedIds.length < 2) {
      return;
    }
    const blocks = orderedIds.map((id) => {
      const members = subtreeIds(id)
        .map((memberId) => byId.get(memberId))
        .filter((rect): rect is LayoutRect => rect !== undefined);
      const top = Math.min(...members.map((member) => member.y));
      const bottom = Math.max(
        ...members.map((member) => member.y + member.height),
      );
      return { members, top, height: bottom - top };
    });
    const slotTops = [...blocks]
      .map((block) => block.top)
      .sort((a, b) => a - b);

    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      const delta = slotTops[index] - block.top;
      if (delta === 0) {
        continue;
      }
      for (const member of block.members) {
        member.y += delta;
      }
    }
  }

  reorderGroup(map.rootIds);
  for (const id of forestVisitOrder(map)) {
    const childIds = map.nodes[id]?.childIds ?? [];
    reorderGroup(childIds);
  }

  return [...byId.values()];
}

/** True when any pair of rectangles shares positive area (touching edges is ok). */
export function hasPositiveAreaOverlap(rects: LayoutRect[]): boolean {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (overlapArea(rects[i], rects[j]) > 0) {
        return true;
      }
    }
  }
  return false;
}

function overlapArea(a: LayoutRect, b: LayoutRect): number {
  const xOverlap = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  return xOverlap * yOverlap;
}
