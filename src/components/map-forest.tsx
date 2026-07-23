import type { KeyboardEvent, ReactNode } from "react";

import type { InteractionMode } from "@/domain/interaction";
import { focusedIdOf, isEditing } from "@/domain/interaction";
import type { MapRecord, NodeRecord } from "@/domain/types";
import { NodeView } from "./node-view";

interface MapForestProps {
  map: MapRecord;
  mode: InteractionMode;
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onCreateSibling: () => void;
  onCreateChild: () => void;
  onTypeCharacter: (value: string) => void;
  onArrow: (direction: "up" | "down" | "left" | "right") => void;
}

function walk(
  map: MapRecord,
  nodeIds: string[],
  depth: number,
  render: (node: NodeRecord, depth: number) => ReactNode,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  for (const id of nodeIds) {
    const node = map.nodes[id];
    if (!node) {
      continue;
    }
    nodes.push(
      <li key={node.id} className="list-none">
        {render(node, depth)}
        {node.childIds.length > 0 ? (
          <ul role="group" className="mt-2 flex flex-col gap-2">
            {walk(map, node.childIds, depth + 1, render)}
          </ul>
        ) : null}
      </li>,
    );
  }
  return nodes;
}

export function MapForest({
  map,
  mode,
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
  onCreateSibling,
  onCreateChild,
  onTypeCharacter,
  onArrow,
}: MapForestProps) {
  const focusedId = focusedIdOf(mode);
  const editing = isEditing(mode);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("textarea, input")) {
      return;
    }

    if (editing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onCreateSibling();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onCreateChild();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onArrow("up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onArrow("down");
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onArrow("left");
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onArrow("right");
      return;
    }

    if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onTypeCharacter(event.key);
    }
  }

  return (
    <div
      role="tree"
      tabIndex={0}
      aria-label="Map nodes"
      aria-activedescendant={`node-${focusedId}`}
      className="bg-card/40 focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
      onKeyDown={onKeyDown}
      data-testid="map-forest"
    >
      <ul role="group" className="flex flex-col gap-2">
        {walk(map, map.rootIds, 0, (node, depth) => (
          <NodeView
            node={node}
            depth={depth}
            mode={mode}
            onFocus={onFocus}
            onStartEditing={onStartEditing}
            onDraftChange={onDraftChange}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        ))}
      </ul>
    </div>
  );
}
