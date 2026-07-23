import type { Edge, Node } from "@xyflow/react";
import { Position } from "@xyflow/react";

import type { LayoutResult } from "./layout-map";

export const MINDI_NODE_TYPE = "mindi";

export interface FlowNodeData extends Record<string, unknown> {
  layoutWidth: number;
  layoutHeight: number;
}

export interface FlowEdgeData extends Record<string, unknown> {
  emphasized: boolean;
}

export function projectLayoutToFlow(
  layout: LayoutResult,
  options: { focusedId: string | null },
): { nodes: Node<FlowNodeData>[]; edges: Edge<FlowEdgeData>[] } {
  const focusedId = options.focusedId;
  const emphasized = new Set<string>();

  if (focusedId) {
    for (const edge of layout.edges) {
      if (edge.parentId === focusedId || edge.childId === focusedId) {
        emphasized.add(`${edge.parentId}->${edge.childId}`);
      }
    }
  }

  const nodes: Node<FlowNodeData>[] = layout.nodes.map((rect) => ({
    id: rect.id,
    type: MINDI_NODE_TYPE,
    position: { x: rect.x, y: rect.y },
    data: {
      layoutWidth: rect.width,
      layoutHeight: rect.height,
    },
    width: rect.width,
    height: rect.height,
    draggable: false,
    selectable: false,
    connectable: false,
    focusable: false,
    // RF disables pointer events when not selectable/draggable; restore for Node UI.
    style: { pointerEvents: "all" },
    className: "nopan",
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges: Edge<FlowEdgeData>[] = layout.edges.map((edge) => {
    const id = `${edge.parentId}->${edge.childId}`;
    return {
      id,
      source: edge.parentId,
      target: edge.childId,
      type: "smoothstep",
      selectable: false,
      focusable: false,
      interactionWidth: 0,
      data: { emphasized: emphasized.has(id) },
    };
  });

  return { nodes, edges };
}
