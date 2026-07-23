import { useState } from "react";

import { ResponsiveOverlay } from "@/components/responsive-overlay";
import { Button } from "@/components/ui/button";
import { focusedIdOf, isEditing, type InteractionMode } from "@/domain/interaction";
import {
  canDeleteNode,
  canDetach,
  canMoveDown,
  canMoveUp,
  canSwapWithParent,
  descendantCount,
  eligibleMoveUnderTargets,
} from "@/domain/structure";
import type { MapRecord } from "@/domain/types";

interface StructureCommandsProps {
  map: MapRecord;
  mode: InteractionMode;
  onCreateRoot: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveUnder: (targetId: string) => void;
  onSwapWithParent: () => void;
  onDetach: () => void;
  onDelete: () => void;
}

function nodeLabel(map: MapRecord, nodeId: string): string {
  const markdown = map.nodes[nodeId]?.markdown.trim() ?? "";
  return markdown.length > 0 ? markdown : "Empty Node";
}

export function StructureCommands({
  map,
  mode,
  onCreateRoot,
  onMoveUp,
  onMoveDown,
  onMoveUnder,
  onSwapWithParent,
  onDetach,
  onDelete,
}: StructureCommandsProps) {
  const [moveUnderOpen, setMoveUnderOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editing = isEditing(mode);
  const focusedId = focusedIdOf(mode);
  const moveUpEnabled = !editing && canMoveUp(map, focusedId);
  const moveDownEnabled = !editing && canMoveDown(map, focusedId);
  const swapEnabled = !editing && canSwapWithParent(map, focusedId);
  const detachEnabled = !editing && canDetach(map, focusedId);
  const deleteEnabled = !editing && canDeleteNode(map, focusedId);
  const targets = editing ? [] : eligibleMoveUnderTargets(map, focusedId);
  const descendants = descendantCount(map, focusedId);
  const finalNodeBlocked = !canDeleteNode(map, focusedId);

  function requestDelete() {
    if (!deleteEnabled) {
      return;
    }
    if (descendants > 0) {
      setDeleteOpen(true);
      return;
    }
    onDelete();
  }

  function confirmDelete() {
    setDeleteOpen(false);
    onDelete();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="structure-commands"
    >
      <Button type="button" variant="secondary" size="sm" disabled={editing} onClick={onCreateRoot}>
        Create Root
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!moveUpEnabled}
        onClick={onMoveUp}
      >
        Move up
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!moveDownEnabled}
        onClick={onMoveDown}
      >
        Move down
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={targets.length === 0}
        onClick={() => setMoveUnderOpen(true)}
      >
        Move under
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!swapEnabled}
        onClick={onSwapWithParent}
      >
        Swap with parent
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!detachEnabled}
        onClick={onDetach}
      >
        Detach
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!deleteEnabled}
        onClick={requestDelete}
        title={
          finalNodeBlocked
            ? "The final Node cannot be deleted. Create another Node first."
            : undefined
        }
      >
        Delete
      </Button>
      {finalNodeBlocked ? (
        <p className="text-muted-foreground text-sm" role="status">
          The final Node cannot be deleted. Create another Node first.
        </p>
      ) : null}

      <ResponsiveOverlay
        open={moveUnderOpen}
        onOpenChange={setMoveUnderOpen}
        title="Move under"
        description="Choose a target Node. The Focused Node becomes its last child."
        contentTestId="move-under-picker"
      >
        <ul className="flex flex-col gap-2" aria-label="Move under targets">
          {targets.map((targetId) => (
            <li key={targetId}>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  onMoveUnder(targetId);
                  setMoveUnderOpen(false);
                }}
              >
                {nodeLabel(map, targetId)}
              </Button>
            </li>
          ))}
        </ul>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete subtree?"
        description={`This deletes the Focused Node and ${descendants} descendant${descendants === 1 ? "" : "s"}.`}
        contentTestId="delete-confirm"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </ResponsiveOverlay>
    </div>
  );
}
