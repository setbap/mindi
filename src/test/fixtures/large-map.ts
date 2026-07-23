import {
  DEFAULT_NODE_WIDTH,
  type ColorSlot,
  type MapRecord,
  type NodeRecord,
} from "../../domain/types";

export const LARGE_MAP_NODE_COUNT = 512;

export function createLargeMapFixture(
  nodeCount = LARGE_MAP_NODE_COUNT,
): MapRecord {
  if (nodeCount < 1) {
    throw new Error("Large Map fixture requires at least one Node.");
  }

  const nodes: Record<string, NodeRecord> = {};
  for (let index = 0; index < nodeCount; index += 1) {
    const id = nodeId(index);
    const parentIndex = index === 0 ? null : Math.floor((index - 1) / 4);
    nodes[id] = {
      id,
      markdown: `Node ${index + 1}`,
      width: index % 5 === 0 ? 360 : DEFAULT_NODE_WIDTH,
      colorSlot: ((index % 9) + 1) as ColorSlot,
      parentId: parentIndex === null ? null : nodeId(parentIndex),
      childIds: [],
    };
  }

  for (let index = 1; index < nodeCount; index += 1) {
    const parent = nodes[nodeId(Math.floor((index - 1) / 4))];
    parent.childIds.push(nodeId(index));
  }

  return {
    id: `scale-${nodeCount}`,
    name: `${nodeCount}-Node Scale Map`,
    rootIds: [nodeId(0)],
    nodes,
  };
}

function nodeId(index: number): string {
  return `node-${String(index).padStart(3, "0")}`;
}
