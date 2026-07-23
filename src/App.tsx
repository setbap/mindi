import { useState } from "react";

import { MapCanvas } from "@/components/map-canvas";
import { MapManager } from "@/components/map-manager";
import { StructureCommands } from "@/components/structure-commands";
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
    typeCharacter,
    arrow,
  } = useMindiApp();
  const [managerOpen, setManagerOpen] = useState(false);

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

  const { catalog, openMap, mode } = state;

  return (
    <main className="flex h-screen flex-col gap-4 p-4 md:p-6">
      <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Mindi</p>
          <h1 className="text-2xl font-semibold">{openMap.name}</h1>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setManagerOpen(true)}
        >
          Maps
        </Button>
      </header>

      <div className="mx-auto w-full max-w-6xl shrink-0">
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
      </div>

      <div className="mx-auto min-h-0 w-full max-w-6xl flex-1">
        <MapCanvas
          map={openMap}
          mode={mode}
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
        />
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
