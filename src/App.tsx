import { useRef, useState } from "react";

import {
  MapCanvas,
  type MapCanvasHandle,
} from "@/components/map-canvas";
import { MapManager } from "@/components/map-manager";
import { NodeBrowser } from "@/components/node-browser";
import { StructureCommands } from "@/components/structure-commands";
import { StructureLiveRegion } from "@/components/structure-live-region";
import { StyleCommands } from "@/components/style-commands";
import { Button } from "@/components/ui/button";
import { useMindiApp } from "./app/use-mindi-app";

export function App() {
  const {
    state,
    createMap,
    renameMap,
    switchMap,
    deleteMap,
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
    undo,
    redo,
    typeCharacter,
    arrow,
  } = useMindiApp();
  const [managerOpen, setManagerOpen] = useState(false);
  const canvasRef = useRef<MapCanvasHandle>(null);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading Mindi…</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="alert">{state.error}</p>
      </main>
    );
  }

  const { catalog, openMap, mode, canUndo, canRedo } = state;

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

  return (
    <main className="flex h-screen flex-col gap-4 p-4 md:p-6">
      <StructureLiveRegion map={openMap} mode={mode} />
      <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Mindi</p>
          <h1 className="text-2xl font-semibold">{openMap.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => exitCanvasToBrowser()}
          >
            Node browser
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setManagerOpen(true)}
          >
            Maps
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-2">
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
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 md:flex-row">
        <div className="h-56 shrink-0 md:h-full md:w-72">
          <NodeBrowser
            map={openMap}
            mode={mode}
            onFocus={focusNode}
            onReveal={revealOnCanvas}
          />
        </div>
        <div className="min-h-0 min-w-0 flex-1">
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
      />
    </main>
  );
}
