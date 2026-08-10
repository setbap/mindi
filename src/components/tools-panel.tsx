import type { ReactNode } from "react";
import { FolderOpen } from "lucide-react";

import { StructureCommands } from "@/components/structure-commands";
import { StyleCommands } from "@/components/style-commands";
import { Button } from "@/components/ui/button";
import type { InteractionMode } from "@/domain/interaction";
import type { CatalogRecord, ColorSlot, Language, MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";

interface ToolsPanelProps {
  map: MapRecord;
  mode: InteractionMode;
  catalog: CatalogRecord;
  canUndo: boolean;
  canRedo: boolean;
  onOpenMaps: () => void;
  onSetLanguage: (language: Language) => void;
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wide uppercase">
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
  onOpenMaps,
  onSetLanguage,
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
  const { t, language } = useI18n();

  return (
    <aside
      className="app-inspector flex h-full min-h-0 w-full flex-col"
      data-testid="tools-panel"
      aria-label={t("structureCommands")}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        <Section title={t("toolsSectionMap")}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 w-full justify-start gap-2 px-2 font-normal"
            onClick={onOpenMaps}
          >
            <FolderOpen />
            <span className="truncate">{t("maps")}</span>
          </Button>
        </Section>

        <Section title={t("toolsSectionStructure")}>
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
        </Section>

        <Section title={t("toolsSectionStyle")}>
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
        </Section>

        <Section title={t("toolsSectionApp")}>
          <label className="flex flex-col gap-1 px-1">
            <span className="text-muted-foreground text-xs">{t("language")}</span>
            <select
              aria-label={t("language")}
              className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
              value={language}
              onChange={(event) => {
                onSetLanguage(event.target.value as Language);
              }}
              data-testid="language-select"
            >
              <option value="en">{t("languageEnglish")}</option>
              <option value="fa">{t("languagePersian")}</option>
            </select>
          </label>
        </Section>
      </div>
    </aside>
  );
}
