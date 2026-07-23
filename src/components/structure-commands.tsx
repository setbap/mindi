import { useState } from "react";

import { ResponsiveOverlay } from "@/components/responsive-overlay";
import { Button } from "@/components/ui/button";
import {
  focusedIdOf,
  isEditing,
  type InteractionMode,
} from "@/domain/interaction";
import { nodeLabel as domainNodeLabel } from "@/domain/node-browser";
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
import { useI18n } from "@/i18n/i18n-context";

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
  const { t } = useI18n();
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

  function labelFor(nodeId: string): string {
    const markdown = map.nodes[nodeId]?.markdown ?? "";
    if (markdown.trim().length === 0) {
      return t("emptyNode");
    }
    return domainNodeLabel(markdown);
  }

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
      aria-label={t("structureCommands")}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={editing}
        onClick={onCreateRoot}
      >
        {t("createRoot")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!moveUpEnabled}
        onClick={onMoveUp}
      >
        {t("moveUp")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!moveDownEnabled}
        onClick={onMoveDown}
      >
        {t("moveDown")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={targets.length === 0}
        onClick={() => setMoveUnderOpen(true)}
      >
        {t("moveUnder")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!swapEnabled}
        onClick={onSwapWithParent}
      >
        {t("swapWithParent")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!detachEnabled}
        onClick={onDetach}
      >
        {t("detach")}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!deleteEnabled}
        onClick={requestDelete}
        title={finalNodeBlocked ? t("finalNodeCannotDelete") : undefined}
      >
        {t("delete")}
      </Button>
      {finalNodeBlocked ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("finalNodeCannotDelete")}
        </p>
      ) : null}

      <ResponsiveOverlay
        open={moveUnderOpen}
        onOpenChange={setMoveUnderOpen}
        title={t("moveUnderTitle")}
        description={t("moveUnder")}
        contentTestId="move-under-picker"
      >
        <ul className="flex flex-col gap-2" aria-label={t("moveUnderTargets")}>
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
                {labelFor(targetId)}
              </Button>
            </li>
          ))}
        </ul>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody", { count: descendants })}
        contentTestId="delete-confirm"
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={confirmDelete}>
            {t("delete")}
          </Button>
        </div>
      </ResponsiveOverlay>
    </div>
  );
}
