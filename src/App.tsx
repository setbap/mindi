import { useEffect, useRef, useState } from "react";

import { MapCanvas, type MapCanvasHandle } from "@/components/map-canvas";
import { MapManager } from "@/components/map-manager";
import { NodeBrowser } from "@/components/node-browser";
import { StructureCommands } from "@/components/structure-commands";
import { StructureLiveRegion } from "@/components/structure-live-region";
import { StyleCommands } from "@/components/style-commands";
import { Button } from "@/components/ui/button";
import { focusedIdOf } from "@/domain/interaction";
import type { Language } from "@/domain/types";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { I18nProvider, useI18n } from "@/i18n/i18n-context";
import { t as translate } from "@/i18n/t";
import { bindVisibleViewport } from "@/shell/bind-visible-viewport";
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
  const [managerOpen, setManagerOpen] = useState(false);
  const canvasRef = useRef<MapCanvasHandle>(null);
  const shellRef = useRef<HTMLElement>(null);
  const focusedIdRef = useRef(focusedIdOf(state.mode));
  const { catalog, openMap, mode, canUndo, canRedo } = state;
  const dir = chromeDir(language);
  const lang = chromeLang(language);

  focusedIdRef.current = focusedIdOf(mode);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [language, dir, lang]);

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

  function revealOnCanvas(nodeId: string) {
    focusNode(nodeId);
    requestAnimationFrame(() => {
      canvasRef.current?.revealNode(nodeId);
    });
  }

  function exitCanvasToBrowser() {
    document
      .querySelector<HTMLInputElement>(
        '[data-testid="map-node-browser"] input[type="search"]',
      )
      ?.focus();
  }

  const commands = (
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

  return (
    <main
      ref={shellRef}
      className="app-shell"
      data-testid="app-shell"
      dir={dir}
      lang={lang}
    >
      <div className="app-workspace mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-3 md:gap-4 md:p-6">
        <StructureLiveRegion map={openMap} mode={mode} />
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">{t("brand")}</p>
            <h1 className="text-2xl font-semibold">{openMap.name}</h1>
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
              onClick={() => exitCanvasToBrowser()}
            >
              {t("nodeBrowser")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setManagerOpen(true)}
            >
              {t("maps")}
            </Button>
          </div>
        </header>

        {isDesktop ? (
          <div className="flex shrink-0 flex-col gap-2">{commands}</div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
          <div className="h-44 shrink-0 md:h-full md:w-72">
            <NodeBrowser
              map={openMap}
              mode={mode}
              onFocus={focusNode}
              onReveal={revealOnCanvas}
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1" dir="ltr">
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
              onCreateSibling={createSibling}
              onCreateChild={createChild}
              onTypeCharacter={typeCharacter}
              onArrow={arrow}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onCommitWidth={(nodeId, width) => setWidth(width, nodeId)}
              onEscapeExit={exitCanvasToBrowser}
            />
          </div>
        </div>

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
            {commands}
          </div>
        ) : null}
      </footer>
    </main>
  );
}
