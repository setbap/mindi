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
      title={label}
      aria-label={label}
      onClick={onClick}
      className="size-auto aspect-square w-full p-0"
    >
      {icon}
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
  const list = layout === "list";

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
      className={
        list
          ? "flex flex-wrap items-center gap-2 px-1 py-1"
          : rail
            ? "grid grid-cols-4 gap-1.5 py-0.5"
            : "flex flex-wrap items-center gap-1.5"
      }
      role="group"
      aria-label={t("colorSlot")}
    >
      {SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          aria-label={t("colorSlotN", { n: slot })}
          aria-pressed={focused?.colorSlot === slot}
          title={t("colorSlotN", { n: slot })}
          disabled={editing || !focused}
          className={cn(
            "rounded-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.35)] transition-[box-shadow,transform] disabled:opacity-40",
            list ? "size-7" : rail ? "aspect-square w-full" : "size-5",
            "hover:scale-105 hover:shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.5)]",
            focused?.colorSlot === slot &&
              "shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.45),0_0_0_2px_var(--card),0_0_0_3.5px_var(--ring)]",
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

  if (list) {
    return (
      <div
        className="flex w-full flex-col gap-0.5"
        data-testid="style-commands"
        aria-label={t("styleCommands")}
      >
        <button
          type="button"
          disabled={editing || !focused}
          title={t("resize")}
          aria-label={t("resize")}
          onClick={() => setResizeOpen(true)}
          className={cn(
            "text-foreground hover:bg-accent/50 flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <Maximize2 className="size-5 shrink-0" />
          <span className="truncate">{t("resize")}</span>
        </button>
        <button
          type="button"
          disabled={editing || !focused}
          title={t("resetWidth")}
          aria-label={t("resetWidth")}
          onClick={onResetWidth}
          className={cn(
            "text-foreground hover:bg-accent/50 flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <RotateCcw className="size-5 shrink-0" />
          <span className="truncate">{t("resetWidth")}</span>
        </button>
        <button
          type="button"
          title={t("palette")}
          aria-label={t("palette")}
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "text-foreground hover:bg-accent/50 flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <Palette className="size-5 shrink-0" />
          <span className="truncate">{t("palette")}</span>
        </button>
        <button
          type="button"
          disabled={!canUndo}
          title={t("undo")}
          aria-label={t("undo")}
          onClick={onUndo}
          className={cn(
            "text-foreground hover:bg-accent/50 flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <Undo2 className="size-5 shrink-0" />
          <span className="truncate">{t("undo")}</span>
        </button>
        <button
          type="button"
          disabled={!canRedo}
          title={t("redo")}
          aria-label={t("redo")}
          onClick={onRedo}
          className={cn(
            "text-foreground hover:bg-accent/50 flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <Redo2 className="size-5 shrink-0" />
          <span className="truncate">{t("redo")}</span>
        </button>
        <div className="pt-2">{colorSlots}</div>
        {overlays}
      </div>
    );
  }

  if (rail) {
    return (
      <div
        className="flex w-full flex-col gap-1"
        data-testid="style-commands"
        aria-label={t("styleCommands")}
      >
        <div className="grid grid-cols-4 gap-1">
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
        </div>
        {colorSlots}
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
