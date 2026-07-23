import { setNodeColorSlot } from "./palette";
import { resetNodeWidth, setNodeWidth } from "./resize";
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
  initialFocusedId,
  moveDown,
  moveUnder,
  moveUp,
  siblingIdsFor,
  swapWithParent,
} from "./structure";
import type { ColorSlot, MapRecord } from "./types";

export type InteractionMode =
  | { kind: "focused"; focusedId: string }
  | { kind: "editing"; focusedId: string; draft: string };

export interface InteractionSnapshot {
  map: MapRecord;
  mode: InteractionMode;
  /** True when the Map forest/content should be persisted. */
  dirty: boolean;
}

export type InteractionAction =
  | { type: "focus"; nodeId: string }
  | { type: "startEditing" }
  | { type: "typeCharacter"; value: string }
  | { type: "setDraft"; value: string }
  | { type: "commit" }
  | { type: "cancel" }
  | { type: "createSibling" }
  | { type: "createChild" }
  | { type: "createRoot" }
  | { type: "moveUp" }
  | { type: "moveDown" }
  | { type: "moveUnder"; targetId: string }
  | { type: "swapWithParent" }
  | { type: "detach" }
  | { type: "deleteNode" }
  | { type: "setWidth"; width: number; nodeId?: string }
  | { type: "resetWidth" }
  | { type: "setColorSlot"; slot: ColorSlot }
  | { type: "insertIndent" }
  | { type: "arrow"; direction: "up" | "down" | "left" | "right" };

export function createInitialInteraction(map: MapRecord): InteractionSnapshot {
  return {
    map,
    mode: { kind: "focused", focusedId: initialFocusedId(map) },
    dirty: false,
  };
}

function navigate(
  map: MapRecord,
  focusedId: string,
  direction: "up" | "down" | "left" | "right",
): string {
  const node = map.nodes[focusedId];
  if (!node) {
    return focusedId;
  }

  if (direction === "left" && node.parentId) {
    return node.parentId;
  }
  if (direction === "right" && node.childIds.length > 0) {
    return node.childIds[0];
  }

  const items = siblingIdsFor(map, focusedId);
  const index = items.indexOf(focusedId);
  if (direction === "up" && index > 0) {
    return items[index - 1];
  }
  if (direction === "down" && index >= 0 && index < items.length - 1) {
    return items[index + 1];
  }
  return focusedId;
}

export function reduceInteraction(
  snapshot: InteractionSnapshot,
  action: InteractionAction,
): InteractionSnapshot {
  const { map, mode } = snapshot;

  if (mode.kind === "editing") {
    switch (action.type) {
      case "focus": {
        if (!map.nodes[action.nodeId]) {
          return { ...snapshot, dirty: false };
        }
        return {
          map,
          mode: { kind: "focused", focusedId: action.nodeId },
          dirty: false,
        };
      }
      case "setDraft":
        return {
          ...snapshot,
          mode: { ...mode, draft: action.value },
          dirty: false,
        };
      case "typeCharacter":
        return {
          ...snapshot,
          mode: { ...mode, draft: mode.draft + action.value },
          dirty: false,
        };
      case "insertIndent":
        return {
          ...snapshot,
          mode: { ...mode, draft: `${mode.draft}  ` },
          dirty: false,
        };
      case "commit": {
        const nextMap = commitNodeMarkdown(map, mode.focusedId, mode.draft);
        return {
          map: nextMap,
          mode: { kind: "focused", focusedId: mode.focusedId },
          dirty: true,
        };
      }
      case "cancel":
        return {
          map,
          mode: { kind: "focused", focusedId: mode.focusedId },
          dirty: false,
        };
      default:
        return { ...snapshot, dirty: false };
    }
  }

  // Focused mode
  switch (action.type) {
    case "focus":
      if (!map.nodes[action.nodeId]) {
        return { ...snapshot, dirty: false };
      }
      return {
        map,
        mode: { kind: "focused", focusedId: action.nodeId },
        dirty: false,
      };
    case "startEditing": {
      const node = map.nodes[mode.focusedId];
      if (!node) {
        return { ...snapshot, dirty: false };
      }
      return {
        map,
        mode: {
          kind: "editing",
          focusedId: mode.focusedId,
          draft: node.markdown,
        },
        dirty: false,
      };
    }
    case "typeCharacter": {
      const node = map.nodes[mode.focusedId];
      if (!node) {
        return { ...snapshot, dirty: false };
      }
      return {
        map,
        mode: {
          kind: "editing",
          focusedId: mode.focusedId,
          draft: node.markdown + action.value,
        },
        dirty: false,
      };
    }
    case "createSibling": {
      const { map: nextMap, newNodeId } = createSiblingBelow(
        map,
        mode.focusedId,
      );
      return {
        map: nextMap,
        mode: {
          kind: "editing",
          focusedId: newNodeId,
          draft: "",
        },
        dirty: true,
      };
    }
    case "createChild": {
      const { map: nextMap, newNodeId } = createLastChild(map, mode.focusedId);
      return {
        map: nextMap,
        mode: {
          kind: "editing",
          focusedId: newNodeId,
          draft: "",
        },
        dirty: true,
      };
    }
    case "createRoot": {
      const result = createRoot(map);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "moveUp": {
      if (!canMoveUp(map, mode.focusedId)) {
        return { ...snapshot, dirty: false };
      }
      const result = moveUp(map, mode.focusedId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "moveDown": {
      if (!canMoveDown(map, mode.focusedId)) {
        return { ...snapshot, dirty: false };
      }
      const result = moveDown(map, mode.focusedId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "moveUnder": {
      const result = moveUnder(map, mode.focusedId, action.targetId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "swapWithParent": {
      if (!canSwapWithParent(map, mode.focusedId)) {
        return { ...snapshot, dirty: false };
      }
      const result = swapWithParent(map, mode.focusedId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "detach": {
      if (!canDetach(map, mode.focusedId)) {
        return { ...snapshot, dirty: false };
      }
      const result = detachNode(map, mode.focusedId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "deleteNode": {
      if (!canDeleteNode(map, mode.focusedId)) {
        return { ...snapshot, dirty: false };
      }
      const result = deleteNodeRecursive(map, mode.focusedId);
      return {
        map: result.map,
        mode: { kind: "focused", focusedId: result.focusedId },
        dirty: true,
      };
    }
    case "setWidth": {
      const targetId = action.nodeId ?? mode.focusedId;
      if (!map.nodes[targetId]) {
        return { ...snapshot, dirty: false };
      }
      const nextMap = setNodeWidth(map, targetId, action.width);
      if (nextMap.nodes[targetId].width === map.nodes[targetId].width) {
        return {
          map,
          mode: { kind: "focused", focusedId: targetId },
          dirty: false,
        };
      }
      return {
        map: nextMap,
        mode: { kind: "focused", focusedId: targetId },
        dirty: true,
      };
    }
    case "resetWidth": {
      const nextMap = resetNodeWidth(map, mode.focusedId);
      if (nextMap.nodes[mode.focusedId].width === map.nodes[mode.focusedId].width) {
        return { ...snapshot, dirty: false };
      }
      return {
        map: nextMap,
        mode: { kind: "focused", focusedId: mode.focusedId },
        dirty: true,
      };
    }
    case "setColorSlot": {
      const nextMap = setNodeColorSlot(map, mode.focusedId, action.slot);
      if (nextMap.nodes[mode.focusedId].colorSlot === map.nodes[mode.focusedId].colorSlot) {
        return { ...snapshot, dirty: false };
      }
      return {
        map: nextMap,
        mode: { kind: "focused", focusedId: mode.focusedId },
        dirty: true,
      };
    }
    case "arrow":
      return {
        map,
        mode: {
          kind: "focused",
          focusedId: navigate(map, mode.focusedId, action.direction),
        },
        dirty: false,
      };
    default:
      return { ...snapshot, dirty: false };
  }
}

export function focusedIdOf(mode: InteractionMode): string {
  return mode.focusedId;
}

export function isEditing(mode: InteractionMode): boolean {
  return mode.kind === "editing";
}
