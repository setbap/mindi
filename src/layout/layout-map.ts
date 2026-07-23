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

  for (const node of Object.values(map.nodes)) {
    const size = sizes[node.id] ?? { width: node.width, height: 48 };
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const node of Object.values(map.nodes)) {
    for (const childId of node.childIds) {
      g.setEdge(node.id, childId);
      edges.push({ parentId: node.id, childId });
    }
  }

  layout(g);

  const nodes: LayoutRect[] = Object.keys(map.nodes).map((id) => {
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

  if (hasPositiveAreaOverlap(nodes)) {
    throw new Error("Layout produced positive-area Node overlap.");
  }

  performance.measure(LAYOUT_PERFORMANCE_ENTRY, {
    start: startedAt,
    end: performance.now(),
  });
  return { nodes, edges };
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
