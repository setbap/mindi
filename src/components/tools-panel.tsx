import type { ReactNode } from "react";

import { StructureCommands } from "@/components/structure-commands";
import { StyleCommands } from "@/components/style-commands";
import type { InteractionMode } from "@/domain/interaction";
import type { CatalogRecord, ColorSlot, MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";

interface ToolsPanelProps {
  map: MapRecord;
  mode: InteractionMode;
  catalog: CatalogRecord;
  canUndo: boolean;
  canRedo: boolean;
  onCreateRoot: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveUnder: (targetId: string) => void;
  onSwapWithParent: () => void;
  onDetach: () => void;
  onDelete: () => void;
  onSetWidth: (width: number) => void;
  onResetWidth: () => void;
  onSetColorSlot: (slot: ColorSlot) => void;
  onUpdatePalette: (slot: ColorSlot, hex: string) => void;
  onUndo: () => void;
  onRedo: () => void;
}

function ToolBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-card flex w-full flex-col gap-1.5 rounded-lg border p-2 shadow-sm">
      <h3 className="text-muted-foreground px-0.5 text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ToolsPanel({
  map,
  mode,
  catalog,
  canUndo,
  canRedo,
  onCreateRoot,
  onMoveUp,
  onMoveDown,
  onMoveUnder,
  onSwapWithParent,
  onDetach,
  onDelete,
  onSetWidth,
  onResetWidth,
  onSetColorSlot,
  onUpdatePalette,
  onUndo,
  onRedo,
}: ToolsPanelProps) {
  const { t } = useI18n();

  return (
    <div
      className="flex w-[8.75rem] flex-col gap-2"
      data-testid="tools-panel"
      aria-label={t("structureCommands")}
    >
      <ToolBox title={t("toolsSectionStructure")}>
        <StructureCommands
          layout="rail"
          map={map}
          mode={mode}
          onCreateRoot={onCreateRoot}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onMoveUnder={onMoveUnder}
          onSwapWithParent={onSwapWithParent}
          onDetach={onDetach}
          onDelete={onDelete}
        />
      </ToolBox>

      <ToolBox title={t("toolsSectionStyle")}>
        <StyleCommands
          layout="rail"
          map={map}
          mode={mode}
          catalog={catalog}
          canUndo={canUndo}
          canRedo={canRedo}
          onSetWidth={onSetWidth}
          onResetWidth={onResetWidth}
          onSetColorSlot={onSetColorSlot}
          onUpdatePalette={onUpdatePalette}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      </ToolBox>
    </div>
  );
}
