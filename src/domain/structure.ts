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

export interface StructureResult {
  map: MapRecord;
  focusedId: string;
}

/** Append an empty Root and focus it. */
export function createRoot(map: MapRecord): StructureResult {
  const root = createEmptyRootNode();
  return {
    map: {
      ...map,
      rootIds: [...map.rootIds, root.id],
      nodes: { ...map.nodes, [root.id]: root },
    },
    focusedId: root.id,
  };
}

function requireNode(map: MapRecord, nodeId: string): NodeRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }
  return node;
}

function removeFromParent(map: MapRecord, nodeId: string): MapRecord {
  const node = requireNode(map, nodeId);
  if (node.parentId === null) {
    return {
      ...map,
      rootIds: map.rootIds.filter((id) => id !== nodeId),
    };
  }
  const parent = requireNode(map, node.parentId);
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [parent.id]: {
        ...parent,
        childIds: parent.childIds.filter((id) => id !== nodeId),
      },
    },
  };
}

export function canMoveUp(map: MapRecord, nodeId: string): boolean {
  const order = siblingIds(map, nodeId);
  return order.indexOf(nodeId) > 0;
}

export function canMoveDown(map: MapRecord, nodeId: string): boolean {
  const order = siblingIds(map, nodeId);
  const index = order.indexOf(nodeId);
  return index >= 0 && index < order.length - 1;
}

export function moveUp(map: MapRecord, nodeId: string): StructureResult {
  if (!canMoveUp(map, nodeId)) {
    return { map, focusedId: nodeId };
  }
  const order = [...siblingIds(map, nodeId)];
  const index = order.indexOf(nodeId);
  [order[index - 1], order[index]] = [order[index], order[index - 1]];
  return { map: withSiblingOrder(map, nodeId, order), focusedId: nodeId };
}

export function moveDown(map: MapRecord, nodeId: string): StructureResult {
  if (!canMoveDown(map, nodeId)) {
    return { map, focusedId: nodeId };
  }
  const order = [...siblingIds(map, nodeId)];
  const index = order.indexOf(nodeId);
  [order[index], order[index + 1]] = [order[index + 1], order[index]];
  return { map: withSiblingOrder(map, nodeId, order), focusedId: nodeId };
}

function collectDescendantIds(map: MapRecord, nodeId: string): string[] {
  const node = requireNode(map, nodeId);
  const ids: string[] = [];
  for (const childId of node.childIds) {
    ids.push(childId, ...collectDescendantIds(map, childId));
  }
  return ids;
}

export function descendantCount(map: MapRecord, nodeId: string): number {
  return collectDescendantIds(map, nodeId).length;
}

export function eligibleMoveUnderTargets(
  map: MapRecord,
  nodeId: string,
): string[] {
  requireNode(map, nodeId);
  const excluded = new Set([nodeId, ...collectDescendantIds(map, nodeId)]);
  const targets: string[] = [];

  function walk(ids: string[]) {
    for (const id of ids) {
      if (!excluded.has(id)) {
        targets.push(id);
      }
      const node = map.nodes[id];
      if (node) {
        walk(node.childIds);
      }
    }
  }

  walk(map.rootIds);
  return targets;
}

export function moveUnder(
  map: MapRecord,
  nodeId: string,
  targetId: string,
): StructureResult {
  requireNode(map, nodeId);
  requireNode(map, targetId);
  if (!eligibleMoveUnderTargets(map, nodeId).includes(targetId)) {
    throw new ForestInvariantError(
      "Move under target must exclude the Node and its descendants.",
    );
  }

  const without = removeFromParent(map, nodeId);
  const target = requireNode(without, targetId);
  const node = requireNode(without, nodeId);

  return {
    map: {
      ...without,
      nodes: {
        ...without.nodes,
        [nodeId]: { ...node, parentId: targetId },
        [targetId]: {
          ...target,
          childIds: [...target.childIds, nodeId],
        },
      },
    },
    focusedId: nodeId,
  };
}

export function canSwapWithParent(map: MapRecord, nodeId: string): boolean {
  const node = map.nodes[nodeId];
  return Boolean(node && node.parentId !== null);
}

export function swapWithParent(
  map: MapRecord,
  nodeId: string,
): StructureResult {
  const node = requireNode(map, nodeId);
  if (node.parentId === null) {
    throw new ForestInvariantError("Swap with parent is unavailable for a Root.");
  }

  const parent = requireNode(map, node.parentId);
  const grandparentId = parent.parentId;
  const parentSiblings = [...siblingIds(map, parent.id)];
  const parentIndex = parentSiblings.indexOf(parent.id);

  // Remove focused from parent's children; parent keeps its other children.
  const parentWithoutFocused: NodeRecord = {
    ...parent,
    parentId: nodeId,
    childIds: parent.childIds.filter((id) => id !== nodeId),
  };

  // Focused takes parent's place among grandparent/roots and gains parent as last child.
  const focusedAsParent: NodeRecord = {
    ...node,
    parentId: grandparentId,
    childIds: [...node.childIds, parent.id],
  };

  let next: MapRecord = {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: focusedAsParent,
      [parent.id]: parentWithoutFocused,
    },
  };

  const nextOrder = [...parentSiblings];
  nextOrder[parentIndex] = nodeId;

  if (grandparentId === null) {
    next = { ...next, rootIds: nextOrder };
  } else {
    const grandparent = requireNode(next, grandparentId);
    next = {
      ...next,
      nodes: {
        ...next.nodes,
        [grandparentId]: { ...grandparent, childIds: nextOrder },
      },
    };
  }

  return { map: next, focusedId: nodeId };
}

export function canDetach(map: MapRecord, nodeId: string): boolean {
  const node = map.nodes[nodeId];
  return Boolean(node && node.parentId !== null);
}

export function detachNode(map: MapRecord, nodeId: string): StructureResult {
  const node = requireNode(map, nodeId);
  if (node.parentId === null) {
    throw new ForestInvariantError("Detach is unavailable for a Root.");
  }

  const without = removeFromParent(map, nodeId);
  return {
    map: {
      ...without,
      rootIds: [...without.rootIds, nodeId],
      nodes: {
        ...without.nodes,
        [nodeId]: { ...requireNode(without, nodeId), parentId: null },
      },
    },
    focusedId: nodeId,
  };
}

export function canDeleteNode(map: MapRecord, nodeId: string): boolean {
  if (!map.nodes[nodeId]) {
    return false;
  }
  const removing = 1 + collectDescendantIds(map, nodeId).length;
  return Object.keys(map.nodes).length > removing;
}

export function focusAfterDelete(map: MapRecord, nodeId: string): string {
  const node = requireNode(map, nodeId);
  const order = siblingIds(map, nodeId);
  const index = order.indexOf(nodeId);
  if (index >= 0 && index < order.length - 1) {
    return order[index + 1];
  }
  if (index > 0) {
    return order[index - 1];
  }
  if (node.parentId) {
    return node.parentId;
  }
  // Sole Root among multiple? Should not happen when canDelete; fallback first remaining.
  const remainingRoot = map.rootIds.find((id) => id !== nodeId);
  if (remainingRoot) {
    return remainingRoot;
  }
  throw new ForestInvariantError("Cannot focus after deleting the final Node.");
}

export function deleteNodeRecursive(
  map: MapRecord,
  nodeId: string,
): StructureResult {
  if (!canDeleteNode(map, nodeId)) {
    throw new ForestInvariantError(
      "The final Node cannot be deleted. Create another Node first.",
    );
  }

  const focusedId = focusAfterDelete(map, nodeId);
  const toRemove = new Set([nodeId, ...collectDescendantIds(map, nodeId)]);
  const without = removeFromParent(map, nodeId);
  const nodes: Record<string, NodeRecord> = {};
  for (const [id, node] of Object.entries(without.nodes)) {
    if (!toRemove.has(id)) {
      nodes[id] = node;
    }
  }

  return {
    map: { ...without, nodes },
    focusedId,
  };
}
