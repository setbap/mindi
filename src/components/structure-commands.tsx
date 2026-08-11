import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  GitBranchPlus,
  Replace,
  Trash2,
  Unlink,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

export type CommandLayout = "toolbar" | "rail";

interface StructureCommandsProps {
  map: MapRecord;
  mode: InteractionMode;
  layout?: CommandLayout;
  onCreateRoot: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveUnder: (targetId: string) => void;
  onSwapWithParent: () => void;
  onDetach: () => void;
  onDelete: () => void;
}

function RailButton({
  label,
  icon,
  disabled,
  destructive,
  title,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "secondary"}
      size="sm"
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      onClick={onClick}
      className="size-auto aspect-square w-full p-0"
    >
      {icon}
    </Button>
  );
}

export function StructureCommands({
  map,
  mode,
  layout = "toolbar",
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
  const rail = layout === "rail";

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

  const requestDelete = useCallback(() => {
    if (!deleteEnabled) {
      return;
    }
    if (descendants > 0) {
      setDeleteOpen(true);
      return;
    }
    onDelete();
  }, [deleteEnabled, descendants, onDelete]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (deleteOpen || moveUnderOpen) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest("textarea, input, select, [contenteditable='true']")) {
        return;
      }
      if (target.closest('[role="dialog"], [data-radix-portal]')) {
        return;
      }
      if (!deleteEnabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      requestDelete();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [deleteEnabled, deleteOpen, moveUnderOpen, requestDelete]);

  function confirmDelete() {
    setDeleteOpen(false);
    onDelete();
  }

  const overlays = (
    <>
      {finalNodeBlocked ? (
        <div
          className="pointer-events-none fixed end-3 bottom-3 z-50 max-w-xs"
          data-testid="final-node-delete-guard"
        >
          <p
            className="border-border bg-card text-card-foreground pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-sm"
            role="status"
          >
            {t("finalNodeCannotDelete")}
          </p>
        </div>
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
    </>
  );

  if (rail) {
    return (
      <div
        className="grid grid-cols-4 gap-1"
        data-testid="structure-commands"
        aria-label={t("structureCommands")}
      >
        <RailButton
          label={t("createRoot")}
          icon={<GitBranchPlus />}
          disabled={editing}
          onClick={onCreateRoot}
        />
        <RailButton
          label={t("moveUp")}
          icon={<ArrowUp />}
          disabled={!moveUpEnabled}
          onClick={onMoveUp}
        />
        <RailButton
          label={t("moveDown")}
          icon={<ArrowDown />}
          disabled={!moveDownEnabled}
          onClick={onMoveDown}
        />
        <RailButton
          label={t("moveUnder")}
          icon={<CornerDownRight />}
          disabled={targets.length === 0}
          onClick={() => setMoveUnderOpen(true)}
        />
        <RailButton
          label={t("swapWithParent")}
          icon={<Replace />}
          disabled={!swapEnabled}
          onClick={onSwapWithParent}
        />
        <RailButton
          label={t("detach")}
          icon={<Unlink />}
          disabled={!detachEnabled}
          onClick={onDetach}
        />
        <RailButton
          label={t("delete")}
          icon={<Trash2 />}
          destructive
          disabled={!deleteEnabled}
          title={
            finalNodeBlocked ? t("finalNodeCannotDelete") : t("delete")
          }
          onClick={requestDelete}
        />
        {overlays}
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2")}
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
      {overlays}
    </div>
  );
}
