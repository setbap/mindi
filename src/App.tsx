import { useEffect, useRef, useState } from "react";
import { FolderOpen, Languages } from "lucide-react";

import { MapCanvas, type MapCanvasHandle } from "@/components/map-canvas";
import { MapManager } from "@/components/map-manager";
import {
  MobileActionChrome,
  MobileTopChrome,
} from "@/components/mobile-action-chrome";
import { NodeBrowser } from "@/components/node-browser";
import { StructureCommands } from "@/components/structure-commands";
import { StructureLiveRegion } from "@/components/structure-live-region";
import { StyleCommands } from "@/components/style-commands";
import { ToolsPanel } from "@/components/tools-panel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { focusedIdOf, isEditing } from "@/domain/interaction";
import type { Language } from "@/domain/types";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { I18nProvider, useI18n } from "@/i18n/i18n-context";
import { t as translate } from "@/i18n/t";
import { bindVisibleViewport } from "@/shell/bind-visible-viewport";
import { PwaControls } from "@/pwa/pwa-controls";
import { useMindiApp, type MindiAppController } from "./app/use-mindi-app";

type MobileDrawer = "browser" | "structure" | "style" | null;

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
  const [mobileDrawer, setMobileDrawer] = useState<MobileDrawer>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(openMap.name);
  const canvasRef = useRef<MapCanvasHandle>(null);
  const shellRef = useRef<HTMLElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const focusedIdRef = useRef(focusedIdOf(state.mode));
  const dir = chromeDir(language);
  const lang = chromeLang(language);
  const editing = isEditing(mode);

  function openMobileDrawer(next: Exclude<MobileDrawer, null>) {
    setMobileDrawer(next);
  }

  function closeMobileDrawer() {
    setMobileDrawer(null);
  }

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
      if (
        target.closest(
          '[role="dialog"], [data-radix-portal], [data-vaul-drawer]',
        )
      ) {
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
    if (!isDesktop) {
      openMobileDrawer("browser");
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLInputElement>(
            '[data-testid="map-node-browser"] input[type="search"]',
          )
          ?.focus();
      });
      return;
    }
    document
      .querySelector<HTMLInputElement>(
        '[data-testid="map-node-browser"] input[type="search"]',
      )
      ?.focus();
  }

  function revealFromBrowser(nodeId: string) {
    revealOnCanvas(nodeId);
    closeMobileDrawer();
  }

  function openMapsFromMobile() {
    closeMobileDrawer();
    setManagerOpen(true);
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
                      title={t("mapManager")}
                      aria-label={t("mapManager")}
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
            <div className="relative min-h-0 min-w-0 flex-1">
              <div className="absolute inset-0 min-h-0 min-w-0">{canvas}</div>
              <MobileTopChrome
                title={mapTitle}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
              />
              <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col gap-2 px-3 [&_>_*]:pointer-events-auto">
                <PwaControls
                  editing={isEditing(mode)}
                  onDiscardDraft={cancelEdit}
                />
              </div>
            </div>

            <Drawer
              open={mobileDrawer === "browser"}
              onOpenChange={(open) => {
                if (!open) {
                  closeMobileDrawer();
                }
              }}
              shouldScaleBackground
            >
              <DrawerContent
                data-testid="mobile-browser-drawer"
                className="max-h-[92vh]"
              >
                <DrawerHeader>
                  <DrawerTitle>{t("nodeBrowserHeading")}</DrawerTitle>
                </DrawerHeader>
                <div className="flex min-h-[min(70vh,32rem)] flex-1 flex-col">
                  <NodeBrowser
                    map={openMap}
                    mode={mode}
                    variant="sheet"
                    onFocus={focusNode}
                    onReveal={revealFromBrowser}
                  />
                </div>
              </DrawerContent>
            </Drawer>

            <Drawer
              open={mobileDrawer === "structure"}
              onOpenChange={(open) => {
                if (!open) {
                  closeMobileDrawer();
                }
              }}
              shouldScaleBackground
            >
              <DrawerContent data-testid="mobile-structure-drawer">
                <DrawerHeader>
                  <DrawerTitle>{t("toolsSectionStructure")}</DrawerTitle>
                </DrawerHeader>
                <StructureCommands
                  map={openMap}
                  mode={mode}
                  layout="list"
                  onCreateRoot={createRoot}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onMoveUnder={moveUnder}
                  onSwapWithParent={swapWithParent}
                  onDetach={detach}
                  onDelete={deleteNode}
                />
                <section className="mt-3 flex flex-col gap-0.5">
                  <h3 className="text-lg font-semibold">
                    {t("toolsSectionApp")}
                  </h3>
                  <button
                    type="button"
                    className="text-foreground hover:bg-accent/50 focus-visible:ring-ring flex h-12 w-full items-center gap-3 rounded-md px-1 text-base font-normal transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    title={t("mapManager")}
                    aria-label={t("mapManager")}
                    onClick={openMapsFromMobile}
                  >
                    <FolderOpen className="size-5 shrink-0" />
                    <span className="truncate">{t("mapManager")}</span>
                  </button>
                  <label className="hover:bg-accent/50 flex h-12 w-full cursor-pointer items-center gap-3 rounded-md px-1">
                    <Languages className="text-foreground size-5 shrink-0" />
                    <span className="text-foreground shrink-0 text-base">
                      {t("language")}
                    </span>
                    <select
                      aria-label={t("language")}
                      className="border-input bg-background text-foreground ms-auto h-9 min-w-0 flex-1 rounded-md border px-2 text-sm"
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
                </section>
              </DrawerContent>
            </Drawer>

            <Drawer
              open={mobileDrawer === "style"}
              onOpenChange={(open) => {
                if (!open) {
                  closeMobileDrawer();
                }
              }}
              shouldScaleBackground
            >
              <DrawerContent data-testid="mobile-style-drawer">
                <DrawerHeader>
                  <DrawerTitle>{t("toolsSectionStyle")}</DrawerTitle>
                </DrawerHeader>
                <StyleCommands
                  map={openMap}
                  mode={mode}
                  catalog={catalog}
                  layout="list"
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
              </DrawerContent>
            </Drawer>
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
          <MobileActionChrome
            map={openMap}
            mode={mode}
            onCreateChild={() => {
              createChild();
              canvasRef.current?.focusHost();
            }}
            onCreateSibling={() => {
              createSibling();
              canvasRef.current?.focusHost();
            }}
            onOpenBrowser={() => openMobileDrawer("browser")}
            onOpenStructure={() => openMobileDrawer("structure")}
            onOpenStyle={() => openMobileDrawer("style")}
          />
        ) : null}
      </footer>
    </main>
  );
}
