import { ForestInvariantError } from "./forest";
import type { MapRecord } from "./types";
import { DEFAULT_NODE_WIDTH } from "./types";

export const MIN_NODE_WIDTH = 180;
export const MAX_NODE_WIDTH = 480;

export function clampNodeWidth(width: number): number {
  return Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, Math.round(width)));
}

export function setNodeWidth(
  map: MapRecord,
  nodeId: string,
  width: number,
): MapRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: { ...node, width: clampNodeWidth(width) },
    },
  };
}

export function resetNodeWidth(map: MapRecord, nodeId: string): MapRecord {
  return setNodeWidth(map, nodeId, DEFAULT_NODE_WIDTH);
}
