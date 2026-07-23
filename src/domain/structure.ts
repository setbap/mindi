import { createEmptyRootNode, createId, ForestInvariantError } from "./forest";
import type { MapRecord, NodeRecord } from "./types";
import { DEFAULT_NODE_WIDTH } from "./types";

export function createEmptyNode(
  parentId: string | null,
  id = createId(),
): NodeRecord {
  return {
    id,
    markdown: "",
    width: DEFAULT_NODE_WIDTH,
    colorSlot: 1,
    parentId,
    childIds: [],
  };
}

function siblingIds(map: MapRecord, nodeId: string): string[] {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }
  if (node.parentId === null) {
    return map.rootIds;
  }
  const parent = map.nodes[node.parentId];
  if (!parent) {
    throw new ForestInvariantError(`Parent ${node.parentId} is missing.`);
  }
  return parent.childIds;
}

export function siblingIdsFor(map: MapRecord, nodeId: string): string[] {
  return siblingIds(map, nodeId);
}

function withSiblingOrder(
  map: MapRecord,
  nodeId: string,
  nextOrder: string[],
): MapRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }

  if (node.parentId === null) {
    return { ...map, rootIds: nextOrder };
  }

  const parent = map.nodes[node.parentId];
  if (!parent) {
    throw new ForestInvariantError(`Parent ${node.parentId} is missing.`);
  }

  return {
    ...map,
    nodes: {
      ...map.nodes,
      [parent.id]: { ...parent, childIds: nextOrder },
    },
  };
}

/** Insert an empty sibling immediately below `nodeId` and return the new Node id. */
export function createSiblingBelow(
  map: MapRecord,
  nodeId: string,
): { map: MapRecord; newNodeId: string } {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }

  const newNode =
    node.parentId === null
      ? createEmptyRootNode()
      : createEmptyNode(node.parentId);
  const order = [...siblingIds(map, nodeId)];
  const index = order.indexOf(nodeId);
  order.splice(index + 1, 0, newNode.id);

  const withNode: MapRecord = {
    ...map,
    nodes: { ...map.nodes, [newNode.id]: newNode },
  };

  return {
    map: withSiblingOrder(withNode, nodeId, order),
    newNodeId: newNode.id,
  };
}

/** Append an empty last child under `nodeId` and return the new Node id. */
export function createLastChild(
  map: MapRecord,
  nodeId: string,
): { map: MapRecord; newNodeId: string } {
  const parent = map.nodes[nodeId];
  if (!parent) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }

  const newNode = createEmptyNode(parent.id);
  return {
    map: {
      ...map,
      nodes: {
        ...map.nodes,
        [parent.id]: {
          ...parent,
          childIds: [...parent.childIds, newNode.id],
        },
        [newNode.id]: newNode,
      },
    },
    newNodeId: newNode.id,
  };
}

export function commitNodeMarkdown(
  map: MapRecord,
  nodeId: string,
  markdown: string,
): MapRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }

  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: { ...node, markdown },
    },
  };
}

export function initialFocusedId(map: MapRecord): string {
  const rootId = map.rootIds[0];
  if (!rootId || !map.nodes[rootId]) {
    throw new ForestInvariantError("A Map must contain at least one Root.");
  }
  return rootId;
}
