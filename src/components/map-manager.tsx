import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { canDeleteMap } from "@/domain/catalog";
import type { CatalogRecord } from "@/domain/types";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import { ResponsiveOverlay } from "./responsive-overlay";

interface MapManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CatalogRecord;
  onCreate: () => Promise<void>;
  onRename: (mapId: string, name: string) => Promise<void>;
  onSwitch: (mapId: string) => Promise<void>;
  onDelete: (mapId: string) => Promise<void>;
}

export function MapManager({
  open,
  onOpenChange,
  catalog,
  onCreate,
  onRename,
  onSwitch,
  onDelete,
}: MapManagerProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteAllowed = canDeleteMap(catalog);
  const isDesktop = useIsDesktop();
  const { t } = useI18n();

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  function startRename(mapId: string, currentName: string) {
    setRenamingId(mapId);
    setDraftName(currentName);
  }

  function cancelRename() {
    setRenamingId(null);
    setDraftName("");
  }

  async function commitRename() {
    if (!renamingId) {
      return;
    }
    const mapId = renamingId;
    const name = draftName.trim();
    if (name.length === 0) {
      cancelRename();
      return;
    }
    cancelRename();
    await run(() => onRename(mapId, name));
  }

  async function switchTo(mapId: string) {
    await run(() => onSwitch(mapId));
    onOpenChange(false);
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitRename();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRename();
    }
  }

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={t("maps")}
      description={t("mapManager")}
      contentTestId={isDesktop ? "map-manager-dialog" : "map-manager-sheet"}
    >
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          disabled={busy}
          onClick={() => void run(onCreate)}
        >
          {t("createMap")}
        </Button>

        <ul className="flex flex-col gap-2" aria-label={t("mapCatalog")}>
          {catalog.maps.map((entry) => {
            const isOpen = entry.id === catalog.openMapId;
            const isRenaming = renamingId === entry.id;

            return (
              <li
                key={entry.id}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-3",
                  isOpen && "border-ring ring-ring/40 ring-1",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  {isRenaming ? (
                    <input
                      ref={inputRef}
                      aria-label={t("renameMap", { name: entry.name })}
                      className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={() => void commitRename()}
                      onKeyDown={onRenameKeyDown}
                      disabled={busy}
                    />
                  ) : (
                    <button
                      type="button"
                      className="hover:text-primary flex-1 text-start text-sm font-medium"
                      onClick={() => void switchTo(entry.id)}
                      disabled={busy || isOpen}
                    >
                      {entry.name}
                      {isOpen ? (
                        <span className="text-muted-foreground ms-2 text-xs">
                          {t("openMap")}
                        </span>
                      ) : null}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || isRenaming}
                    onClick={() => startRename(entry.id, entry.name)}
                  >
                    {t("rename")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || isOpen}
                    onClick={() => void switchTo(entry.id)}
                  >
                    {t("switch")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !deleteAllowed}
                    title={
                      deleteAllowed ? t("delete") : t("finalMapCannotDelete")
                    }
                    onClick={() => void run(() => onDelete(entry.id))}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        {!deleteAllowed ? (
          <p className="text-muted-foreground text-sm">
            {t("finalMapCannotDelete")}
          </p>
        ) : null}
      </div>
    </ResponsiveOverlay>
  );
}
