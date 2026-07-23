import { useState } from "react";

import { MapForest } from "@/components/map-forest";
import { MapManager } from "@/components/map-manager";
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
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

      <MapForest
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
      />

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
