import { useEffect, useState, type ReactNode } from "react";
import {
  Maximize2,
  Palette,
  Redo2,
  RotateCcw,
  Undo2,
} from "lucide-react";

import { ResponsiveOverlay } from "@/components/responsive-overlay";
import { Button } from "@/components/ui/button";
import {
  focusedIdOf,
  isEditing,
  type InteractionMode,
} from "@/domain/interaction";
import { paletteColor } from "@/domain/palette";
import {
  clampNodeWidth,
  MAX_NODE_WIDTH,
  MIN_NODE_WIDTH,
} from "@/domain/resize";
import type { CatalogRecord, ColorSlot, MapRecord } from "@/domain/types";
import { DEFAULT_NODE_WIDTH } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

import type { CommandLayout } from "./structure-commands";

interface StyleCommandsProps {
  map: MapRecord;
  mode: InteractionMode;
  catalog: CatalogRecord;
  canUndo: boolean;
  canRedo: boolean;
  layout?: CommandLayout;
  onSetWidth: (width: number) => void;
  onResetWidth: () => void;
  onSetColorSlot: (slot: ColorSlot) => void;
  onUpdatePalette: (slot: ColorSlot, hex: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const satisfies readonly ColorSlot[];

function RailButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-8 w-full justify-start gap-2 px-2 font-normal"
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}

export function StyleCommands({
  map,
  mode,
  catalog,
  canUndo,
  canRedo,
  layout = "toolbar",
  onSetWidth,
  onResetWidth,
  onSetColorSlot,
  onUpdatePalette,
  onUndo,
  onRedo,
}: StyleCommandsProps) {
  const { t } = useI18n();
  const [resizeOpen, setResizeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draftWidth, setDraftWidth] = useState(String(DEFAULT_NODE_WIDTH));
  const rail = layout === "rail";

  const editing = isEditing(mode);
  const focusedId = focusedIdOf(mode);
  const focused = map.nodes[focusedId];

  useEffect(() => {
    if (focused) {
      setDraftWidth(String(focused.width));
    }
  }, [focused]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== "z") {
        return;
      }
      if ((event.target as HTMLElement).closest("textarea, input")) {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        onRedo();
        return;
      }
      onUndo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onUndo, onRedo]);

  function commitAccessibleResize() {
    const parsed = Number(draftWidth);
    if (!Number.isFinite(parsed)) {
      return;
    }
    onSetWidth(clampNodeWidth(parsed));
    setResizeOpen(false);
  }

  const colorSlots = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        rail && "px-1 py-1",
      )}
      role="group"
      aria-label={t("colorSlot")}
    >
      {SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          aria-label={t("colorSlotN", { n: slot })}
          aria-pressed={focused?.colorSlot === slot}
          disabled={editing || !focused}
          className={cn(
            "size-6 rounded-sm border border-black/20 disabled:opacity-40",
            focused?.colorSlot === slot && "ring-ring ring-2",
          )}
          style={{ backgroundColor: paletteColor(catalog.palette, slot) }}
          onClick={() => onSetColorSlot(slot)}
        />
      ))}
    </div>
  );

  const overlays = (
    <>
      <ResponsiveOverlay
        open={resizeOpen}
        onOpenChange={setResizeOpen}
        title={t("resizeNode")}
        description={`${t("width")} (${MIN_NODE_WIDTH}–${MAX_NODE_WIDTH}).`}
        contentTestId="resize-dialog"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm">{t("width")}</span>
          <input
            type="number"
            min={MIN_NODE_WIDTH}
            max={MAX_NODE_WIDTH}
            value={draftWidth}
            aria-label={t("nodeWidth")}
            className="border-input bg-background rounded-md border px-3 py-2"
            onChange={(event) => setDraftWidth(event.target.value)}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setResizeOpen(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={commitAccessibleResize}>
            {t("apply")}
          </Button>
        </div>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        title={t("palette")}
        description={t("palette")}
        contentTestId="palette-editor"
      >
        <ul className="flex flex-col gap-3" aria-label={t("paletteSlots")}>
          {SLOTS.map((slot) => (
            <li key={slot} className="flex items-center gap-3">
              <span className="w-20 text-sm">
                {t("colorSlotN", { n: slot })}
              </span>
              <input
                type="color"
                aria-label={t("colorSlotHex", { n: slot })}
                value={paletteColor(catalog.palette, slot)}
                onChange={(event) =>
                  onUpdatePalette(slot, event.target.value)
                }
              />
            </li>
          ))}
        </ul>
      </ResponsiveOverlay>
    </>
  );

  if (rail) {
    return (
      <div
        className="flex flex-col gap-1"
        data-testid="style-commands"
        aria-label={t("styleCommands")}
      >
        <RailButton
          label={t("resize")}
          icon={<Maximize2 />}
          disabled={editing || !focused}
          onClick={() => setResizeOpen(true)}
        />
        <RailButton
          label={t("resetWidth")}
          icon={<RotateCcw />}
          disabled={editing || !focused}
          onClick={onResetWidth}
        />
        {colorSlots}
        <RailButton
          label={t("palette")}
          icon={<Palette />}
          onClick={() => setPaletteOpen(true)}
        />
        <RailButton
          label={t("undo")}
          icon={<Undo2 />}
          disabled={!canUndo}
          onClick={onUndo}
        />
        <RailButton
          label={t("redo")}
          icon={<Redo2 />}
          disabled={!canRedo}
          onClick={onRedo}
        />
        {overlays}
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="style-commands"
      aria-label={t("styleCommands")}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={editing || !focused}
        onClick={() => setResizeOpen(true)}
      >
        {t("resize")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={editing || !focused}
        onClick={onResetWidth}
      >
        {t("resetWidth")}
      </Button>
      {colorSlots}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setPaletteOpen(true)}
      >
        {t("palette")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canUndo}
        onClick={onUndo}
      >
        {t("undo")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canRedo}
        onClick={onRedo}
      >
        {t("redo")}
      </Button>
      {overlays}
    </div>
  );
}
