import type { ReactNode } from "react";
import {
  CornerDownRight,
  LayoutList,
  ListPlus,
  Palette,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { focusedIdOf, isEditing, type InteractionMode } from "@/domain/interaction";
import { nodeLabel } from "@/domain/node-browser";
import type { MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

const PREVIEW_MAX = 36;

function ChromeIconButton({
  label,
  icon,
  disabled,
  onClick,
  testId,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
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
      data-testid={testId}
      className="bg-card/95 size-11 shrink-0 rounded-full p-0 shadow-sm backdrop-blur-sm"
    >
      {icon}
    </Button>
  );
}

export interface MobileActionChromeProps {
  map: MapRecord;
  mode: InteractionMode;
  onCreateChild: () => void;
  onCreateSibling: () => void;
  onOpenBrowser: () => void;
  onOpenStructure: () => void;
  onOpenStyle: () => void;
}

export function MobileActionChrome({
  map,
  mode,
  onCreateChild,
  onCreateSibling,
  onOpenBrowser,
  onOpenStructure,
  onOpenStyle,
}: MobileActionChromeProps) {
  const { t } = useI18n();
  const editing = isEditing(mode);
  const focusedId = focusedIdOf(mode);
  const focused = map.nodes[focusedId];
  const fullLabel =
    !focused || focused.markdown.trim().length === 0
      ? t("emptyNode")
      : nodeLabel(focused.markdown);
  const preview =
    fullLabel.length > PREVIEW_MAX
      ? `${fullLabel.slice(0, PREVIEW_MAX - 1)}…`
      : fullLabel;

  return (
    <div className="flex flex-col gap-2" data-testid="mobile-action-chrome">
      <div className="flex items-center justify-between gap-3">
        <ChromeIconButton
          label={t("toolsSectionStructure")}
          icon={<LayoutList />}
          onClick={onOpenStructure}
          testId="mobile-open-structure"
        />
        <ChromeIconButton
          label={t("toolsSectionStyle")}
          icon={<Palette />}
          onClick={onOpenStyle}
          testId="mobile-open-style"
        />
      </div>
      <div className="flex items-center gap-2">
        <ChromeIconButton
          label={t("createChild")}
          icon={<CornerDownRight />}
          disabled={editing}
          onClick={onCreateChild}
          testId="mobile-create-child"
        />
        <button
          type="button"
          className={cn(
            "border-border bg-card/95 text-foreground min-w-0 flex-1 truncate rounded-full border px-4 py-2.5 text-sm shadow-sm backdrop-blur-sm",
            "hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          )}
          title={fullLabel}
          aria-label={fullLabel}
          data-testid="mobile-focused-pill"
          onClick={onOpenBrowser}
        >
          {preview}
        </button>
        <ChromeIconButton
          label={t("createSibling")}
          icon={<ListPlus />}
          disabled={editing}
          onClick={onCreateSibling}
          testId="mobile-create-sibling"
        />
      </div>
    </div>
  );
}

export function MobileTopChrome({
  title,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  title: ReactNode;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex min-h-16 items-center gap-2 bg-gradient-to-b from-background from-40% via-background/75 to-transparent px-3 pt-3 pb-6 [&_>_*]:pointer-events-auto"
      data-testid="mobile-top-chrome"
    >
      <ChromeIconButton
        label={t("undo")}
        icon={<Undo2 />}
        disabled={!canUndo}
        onClick={onUndo}
        testId="mobile-undo"
      />
      <div className="min-w-0 flex-1 text-center [&_h1]:text-xl [&_h1]:leading-snug">
        {title}
      </div>
      <ChromeIconButton
        label={t("redo")}
        icon={<Redo2 />}
        disabled={!canRedo}
        onClick={onRedo}
        testId="mobile-redo"
      />
    </div>
  );
}
