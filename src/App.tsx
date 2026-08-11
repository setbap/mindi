import { useEffect, useRef, useState } from "react";

import { MapCanvas, type MapCanvasHandle } from "@/components/map-canvas";
import { MapManager } from "@/components/map-manager";
import { NodeBrowser } from "@/components/node-browser";
import { StructureCommands } from "@/components/structure-commands";
import { StructureLiveRegion } from "@/components/structure-live-region";
import { StyleCommands } from "@/components/style-commands";
import { ToolsPanel } from "@/components/tools-panel";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { focusedIdOf, isEditing } from "@/domain/interaction";
import type { Language } from "@/domain/types";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { I18nProvider, useI18n } from "@/i18n/i18n-context";
import { t as translate } from "@/i18n/t";
import { bindVisibleViewport } from "@/shell/bind-visible-viewport";
import { PwaControls } from "@/pwa/pwa-controls";
import { useMindiApp, type MindiAppController } from "./app/use-mindi-app";

type ReadyController = MindiAppController & {
  state: Extract<MindiAppController["state"], { status: "ready" }>;
};

function chromeLang(language: Language): string {
  return language === "fa" ? "fa" : "en";
}

function chromeDir(language: Language): "rtl" | "ltr" {
  return language === "fa" ? "rtl" : "ltr";
}

export function App() {
  const app = useMindiApp();
  const { state } = app;

  if (state.status === "loading") {
    return (
      <I18nProvider language="en">
        <main className="flex min-h-screen items-center justify-center p-6">
          <p className="text-muted-foreground">{translate("en", "loading")}</p>
        </main>
      </I18nProvider>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="alert">{state.error}</p>
      </main>
    );
  }

  return (
    <I18nProvider language={state.catalog.language}>
      <ReadyApp app={{ ...app, state }} />
    </I18nProvider>
  );
}

function ReadyApp({ app }: { app: ReadyController }) {
  const {
    state,
    createMap,
    renameMap,
    switchMap,
    deleteMap,
    importMaps,
    exportMindiJson,
    focusNode,
    startEditing,
    setDraft,
    commitEdit,
    cancelEdit,
    createSibling,
    createChild,
    createRoot,
    moveUp,
    moveDown,
    moveUnder,
    swapWithParent,
    detach,
    deleteNode,
    setWidth,
    resetWidth,
    setColorSlot,
    updatePalette,
    setLanguage,
    undo,
    redo,
    typeCharacter,
    arrow,
  } = app;
  const { t, language } = useI18n();
  const isDesktop = useIsDesktop();
  const { catalog, openMap, mode, canUndo, canRedo } = state;
  const [managerOpen, setManagerOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(openMap.name);
  const canvasRef = useRef<MapCanvasHandle>(null);
  const shellRef = useRef<HTMLElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const focusedIdRef = useRef(focusedIdOf(state.mode));
  const dir = chromeDir(language);
  const lang = chromeLang(language);
  const editing = isEditing(mode);

  focusedIdRef.current = focusedIdOf(mode);

  useEffect(() => {
    if (!renaming) {
      setRenameDraft(openMap.name);
    }
  }, [openMap.name, renaming]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [language, dir, lang]);

  useEffect(() => {
    document.title = `${t("brand")} - ${openMap.name}`;
    return () => {
      document.title = t("brand");
    };
  }, [openMap.name, t]);

  useEffect(() => {
    if (!shellRef.current) {
      return;
    }
    return bindVisibleViewport(shellRef.current, {
      onSettled: () => {
        canvasRef.current?.revealNode(focusedIdRef.current);
      },
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (managerOpen) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest("textarea")) {
        return;
      }
      if (target.closest('[data-map-rename="true"]')) {
        return;
      }
      if (target.closest('[role="dialog"], [data-radix-portal]')) {
        return;
      }
      if (
        target.closest(
          'input[type="search"], input[type="text"], input[type="number"], input:not([type]), input[type="color"]',
        )
      ) {
        return;
      }
      if (target.closest("select, [contenteditable='true']")) {
        return;
      }
      if (editing) {
        return;
      }
      if (event.key === "Tab" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        createChild();
        canvasRef.current?.focusHost();
        return;
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        createSibling();
        canvasRef.current?.focusHost();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editing, createChild, createSibling, managerOpen]);

  function revealOnCanvas(nodeId: string) {
    focusNode(nodeId);
    canvasRef.current?.focusHost();
    canvasRef.current?.revealNode(nodeId);
  }

  function exitCanvasToBrowser() {
    document
      .querySelector<HTMLInputElement>(
        '[data-testid="map-node-browser"] input[type="search"]',
      )
      ?.focus();
  }

  function beginRename() {
    setRenameDraft(openMap.name);
    setRenaming(true);
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }

  function commitRename() {
    const next = renameDraft.trim();
    setRenaming(false);
    if (next.length > 0 && next !== openMap.name) {
      void renameMap(openMap.id, next);
    } else {
      setRenameDraft(openMap.name);
    }
    canvasRef.current?.focusHost();
  }

  const mapTitle = renaming ? (
    <input
      ref={renameInputRef}
      data-map-rename="true"
      data-testid="map-title-input"
      aria-label={t("renameMap", { name: openMap.name })}
      className="border-input bg-background focus-visible:ring-ring w-full min-w-0 rounded-md border px-2 py-0.5 text-lg font-semibold focus-visible:ring-2 focus-visible:outline-none"
      value={renameDraft}
      onChange={(event) => setRenameDraft(event.target.value)}
      onBlur={commitRename}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          commitRename();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          // Escape also saves per product rule for drafts.
          commitRename();
        }
      }}
    />
  ) : (
    <h1 className="truncate text-lg font-semibold leading-tight">
      <button
        type="button"
        className="hover:text-primary max-w-full truncate text-start"
        onClick={beginRename}
        data-testid="map-title"
      >
        {openMap.name}
      </button>
    </h1>
  );

  const mobileCommands = (
    <>
      <StructureCommands
        map={openMap}
        mode={mode}
        onCreateRoot={createRoot}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onMoveUnder={moveUnder}
        onSwapWithParent={swapWithParent}
        onDetach={detach}
        onDelete={deleteNode}
      />
      <StyleCommands
        map={openMap}
        mode={mode}
        catalog={catalog}
        canUndo={canUndo}
        canRedo={canRedo}
        onSetWidth={setWidth}
        onResetWidth={resetWidth}
        onSetColorSlot={setColorSlot}
        onUpdatePalette={(slot, hex) => {
          void updatePalette(slot, hex);
        }}
        onUndo={undo}
        onRedo={redo}
      />
    </>
  );

  const canvas = (
    <div className="app-canvas-stage h-full min-h-0 min-w-0 w-full" dir="ltr">
      <MapCanvas
        ref={canvasRef}
        map={openMap}
        mode={mode}
        palette={catalog.palette}
        onFocus={focusNode}
        onStartEditing={startEditing}
        onDraftChange={setDraft}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        onTypeCharacter={typeCharacter}
        onArrow={arrow}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onCommitWidth={(nodeId, width) => setWidth(width, nodeId)}
        onEscapeExit={exitCanvasToBrowser}
      />
    </div>
  );

  return (
    <main
      ref={shellRef}
      className="app-shell"
      data-testid="app-shell"
      dir={dir}
      lang={lang}
    >
      <div className="app-workspace flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <StructureLiveRegion map={openMap} mode={mode} />

        {isDesktop ? (
          <>
            <div
              className="bg-background flex h-full shrink-0 flex-col gap-2 p-3"
              style={{ width: "var(--dock-width)" }}
            >
              <div className="border-border bg-card flex shrink-0 items-center rounded-lg border px-3 py-2 shadow-sm">
                <p
                  className="text-foreground text-sm font-semibold leading-none"
                  data-testid="app-brand"
                >
                  {t("brand")}
                </p>
              </div>
              <div className="min-h-0 flex-1">
                <NodeBrowser
                  map={openMap}
                  mode={mode}
                  onFocus={focusNode}
                  onReveal={revealOnCanvas}
                />
              </div>
              <div
                className="border-border bg-card shrink-0 rounded-lg border p-2 shadow-sm"
                data-testid="app-dock-footer"
              >
                <section className="flex flex-col gap-1.5">
                  <h3 className="text-muted-foreground px-0.5 text-[11px] font-semibold tracking-wide uppercase">
                    {t("toolsSectionApp")}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="size-8 p-0"
                      title={t("maps")}
                      aria-label={t("maps")}
                      onClick={() => setManagerOpen(true)}
                    >
                      <FolderOpen />
                    </Button>
                    <label className="flex min-w-0 flex-1 items-center">
                      <span className="sr-only">{t("language")}</span>
                      <select
                        aria-label={t("language")}
                        className="border-input bg-background text-muted-foreground h-8 w-full rounded-md border px-2 text-xs"
                        value={language}
                        onChange={(event) => {
                          void setLanguage(event.target.value as Language);
                        }}
                        data-testid="language-select"
                      >
                        <option value="en">{t("languageEnglish")}</option>
                        <option value="fa">{t("languagePersian")}</option>
                      </select>
                    </label>
                  </div>
                </section>
              </div>
            </div>

            <div className="relative min-h-0 min-w-0 flex-1">
              <div className="absolute inset-0 min-h-0 min-w-0">{canvas}</div>
              <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center bg-gradient-to-b from-background via-background/70 to-transparent px-4 pb-3">
                <div className="pointer-events-auto min-w-0 max-w-[min(28rem,calc(100%-11rem))]">
                  {mapTitle}
                </div>
              </header>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 [&_>_*]:pointer-events-auto">
                <PwaControls
                  editing={isEditing(mode)}
                  onDiscardDraft={cancelEdit}
                />
              </div>
              <div className="pointer-events-none absolute end-3 top-3 z-20 [&_>_*]:pointer-events-auto">
                <ToolsPanel
                  map={openMap}
                  mode={mode}
                  catalog={catalog}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onCreateRoot={createRoot}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onMoveUnder={moveUnder}
                  onSwapWithParent={swapWithParent}
                  onDetach={detach}
                  onDelete={deleteNode}
                  onSetWidth={setWidth}
                  onResetWidth={resetWidth}
                  onSetColorSlot={setColorSlot}
                  onUpdatePalette={(slot, hex) => {
                    void updatePalette(slot, hex);
                  }}
                  onUndo={undo}
                  onRedo={redo}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between gap-4 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-sm">{t("brand")}</p>
                {renaming ? (
                  <input
                    ref={renameInputRef}
                    data-map-rename="true"
                    data-testid="map-title-input"
                    aria-label={t("renameMap", { name: openMap.name })}
                    className="border-input bg-background focus-visible:ring-ring w-full max-w-sm rounded-md border px-2 py-1 text-2xl font-semibold focus-visible:ring-2 focus-visible:outline-none"
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") {
                        event.preventDefault();
                        event.stopPropagation();
                        commitRename();
                      }
                    }}
                  />
                ) : (
                  <h1 className="text-2xl font-semibold">
                    <button
                      type="button"
                      className="hover:text-primary text-start"
                      onClick={beginRename}
                      data-testid="map-title"
                    >
                      {openMap.name}
                    </button>
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">{t("language")}</span>
                  <select
                    aria-label={t("language")}
                    className="border-input bg-background rounded-md border px-2 py-1.5"
                    value={language}
                    onChange={(event) => {
                      void setLanguage(event.target.value as Language);
                    }}
                    data-testid="language-select"
                  >
                    <option value="en">{t("languageEnglish")}</option>
                    <option value="fa">{t("languagePersian")}</option>
                  </select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setManagerOpen(true)}
                >
                  {t("maps")}
                </Button>
              </div>
            </header>

            <PwaControls
              editing={isEditing(mode)}
              onDiscardDraft={cancelEdit}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
              <div className="h-44 shrink-0">
                <NodeBrowser
                  map={openMap}
                  mode={mode}
                  onFocus={focusNode}
                  onReveal={revealOnCanvas}
                />
              </div>
              <div className="min-h-0 min-w-0 flex-1">{canvas}</div>
            </div>
          </>
        )}

        <MapManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          catalog={catalog}
          onCreate={createMap}
          onRename={renameMap}
          onSwitch={switchMap}
          onDelete={deleteMap}
          onImport={importMaps}
          onExport={exportMindiJson}
        />
      </div>

      <footer
        className="bottom-actions"
        data-testid="mobile-action-bar"
        aria-label={t("actionBar")}
        hidden={isDesktop}
      >
        {!isDesktop ? (
          <div className="flex max-h-36 flex-col gap-2 overflow-y-auto">
            {mobileCommands}
          </div>
        ) : null}
      </footer>
    </main>
  );
}
