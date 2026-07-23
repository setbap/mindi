import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialInteraction,
  focusedIdOf,
  reduceInteraction,
  type InteractionAction,
  type InteractionMode,
  type InteractionSnapshot,
} from "../domain/interaction";
import { updatePaletteSlot } from "../domain/palette";
import { setCatalogLanguage } from "../domain/catalog";
import { serializeMindiExport } from "../domain/mindi-json";
import type {
  CatalogRecord,
  ColorSlot,
  Language,
  MapRecord,
} from "../domain/types";
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  pushCommand,
  redo as historyRedo,
  undo as historyUndo,
  type UndoHistory,
} from "../domain/undo-history";
import { createMapRepository } from "../persistence/indexed-db-map-repository";
import type { MapRepository } from "../persistence/map-repository-port";

interface ReadyState {
  status: "ready";
  catalog: CatalogRecord;
  openMap: MapRecord;
  mode: InteractionMode;
  canUndo: boolean;
  canRedo: boolean;
}

interface LoadingState {
  status: "loading";
}

interface ErrorState {
  status: "error";
  error: string;
}

type AppState = LoadingState | ReadyState | ErrorState;

export interface MindiAppController {
  state: AppState;
  createMap: () => Promise<void>;
  renameMap: (mapId: string, name: string) => Promise<void>;
  switchMap: (mapId: string) => Promise<void>;
  deleteMap: (mapId: string) => Promise<void>;
  importMaps: (
    maps: readonly MapRecord[],
    palette?: CatalogRecord["palette"],
  ) => Promise<void>;
  exportMindiJson: (allMaps: boolean) => Promise<string>;
  focusNode: (nodeId: string) => void;
  startEditing: (nodeId: string) => void;
  setDraft: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  createSibling: () => void;
  createChild: () => void;
  createRoot: () => void;
  moveUp: () => void;
  moveDown: () => void;
  moveUnder: (targetId: string) => void;
  swapWithParent: () => void;
  detach: () => void;
  deleteNode: () => void;
  setWidth: (width: number, nodeId?: string) => void;
  resetWidth: () => void;
  setColorSlot: (slot: ColorSlot) => void;
  updatePalette: (slot: ColorSlot, hex: string) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  undo: () => void;
  redo: () => void;
  typeCharacter: (value: string) => void;
  arrow: (direction: "up" | "down" | "left" | "right") => void;
}

function readyFrom(
  catalog: CatalogRecord,
  interaction: InteractionSnapshot,
  history: UndoHistory,
): ReadyState {
  return {
    status: "ready",
    catalog,
    openMap: interaction.map,
    mode: interaction.mode,
    canUndo: historyCanUndo(history),
    canRedo: historyCanRedo(history),
  };
}

function seedHistory(map: MapRecord, focusedId: string): UndoHistory {
  return pushCommand(createHistory(), { map, focusedId });
}

export function useMindiApp(
  createRepository: () => MapRepository = createMapRepository,
): MindiAppController {
  const [state, setState] = useState<AppState>({ status: "loading" });
  const repositoryRef = useRef<MapRepository | null>(null);
  const interactionRef = useRef<InteractionSnapshot | null>(null);
  const catalogRef = useRef<CatalogRecord | null>(null);
  const historyRef = useRef<UndoHistory>(createHistory());

  const commitInteraction = useCallback(async (next: InteractionSnapshot) => {
    interactionRef.current = next;
    if (next.dirty) {
      historyRef.current = pushCommand(historyRef.current, {
        map: next.map,
        focusedId: focusedIdOf(next.mode),
      });
      await repositoryRef.current?.saveMap(next.map);
    }
    const catalog = catalogRef.current;
    if (!catalog) {
      return;
    }
    setState(readyFrom(catalog, next, historyRef.current));
  }, []);

  const dispatch = useCallback(
    (action: InteractionAction) => {
      const current = interactionRef.current;
      const catalog = catalogRef.current;
      if (!current || !catalog) {
        return;
      }
      void commitInteraction(reduceInteraction(current, action));
    },
    [commitInteraction],
  );

  const openMapSession = useCallback(
    (catalog: CatalogRecord, openMap: MapRecord) => {
      const interaction = createInitialInteraction(openMap);
      catalogRef.current = catalog;
      interactionRef.current = interaction;
      historyRef.current = seedHistory(openMap, focusedIdOf(interaction.mode));
      setState(readyFrom(catalog, interaction, historyRef.current));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const repository = createRepository();
    repositoryRef.current = repository;

    async function bootstrap() {
      try {
        const { catalog, openMap } = await repository.initialize();
        if (!cancelled) {
          openMapSession(catalog, openMap);
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Bootstrap failed.",
          });
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [createRepository, openMapSession]);

  const createMap = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.createMap();
    openMapSession(catalog, openMap);
  }, [openMapSession]);

  const renameMap = useCallback(async (mapId: string, name: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const catalog = await repository.renameMap(mapId, name);
    catalogRef.current = catalog;
    setState((prev) => {
      if (prev.status !== "ready") {
        return prev;
      }
      const renamedName = catalog.maps.find(
        (entry) => entry.id === mapId,
      )?.name;
      const openMap =
        prev.openMap.id === mapId && renamedName
          ? { ...prev.openMap, name: renamedName }
          : prev.openMap;
      if (interactionRef.current && openMap.id === prev.openMap.id) {
        interactionRef.current = {
          ...interactionRef.current,
          map: openMap,
        };
      }
      return { ...prev, catalog, openMap };
    });
  }, []);

  const switchMap = useCallback(
    async (mapId: string) => {
      const repository = repositoryRef.current;
      if (!repository) {
        return;
      }
      const { catalog, openMap } = await repository.switchMap(mapId);
      openMapSession(catalog, openMap);
    },
    [openMapSession],
  );

  const deleteMap = useCallback(
    async (mapId: string) => {
      const repository = repositoryRef.current;
      if (!repository) {
        return;
      }
      const { catalog, openMap } = await repository.deleteMap(mapId);
      openMapSession(catalog, openMap);
    },
    [openMapSession],
  );

  const importMaps = useCallback(
    async (maps: readonly MapRecord[], palette?: CatalogRecord["palette"]) => {
      const repository = repositoryRef.current;
      const interaction = interactionRef.current;
      if (!repository || !interaction) {
        return;
      }
      const catalog = await repository.importMaps(maps, palette);
      catalogRef.current = catalog;
      setState(readyFrom(catalog, interaction, historyRef.current));
    },
    [],
  );

  const exportMindiJson = useCallback(async (allMaps: boolean) => {
    const catalog = catalogRef.current;
    const interaction = interactionRef.current;
    const repository = repositoryRef.current;
    if (!catalog || !interaction || !repository) {
      throw new Error("Mindi is still loading.");
    }
    if (!allMaps) {
      return serializeMindiExport([interaction.map], catalog.palette);
    }
    const maps = await Promise.all(
      catalog.maps.map(async (entry) => {
        if (entry.id === interaction.map.id) {
          return interaction.map;
        }
        const map = await repository.loadMap(entry.id);
        if (!map) {
          throw new Error(`Map ${entry.id} is missing from persistence.`);
        }
        return map;
      }),
    );
    return serializeMindiExport(maps, catalog.palette);
  }, []);

  const focusNode = useCallback(
    (nodeId: string) => dispatch({ type: "focus", nodeId }),
    [dispatch],
  );

  const startEditing = useCallback(
    (nodeId: string) => {
      const current = interactionRef.current;
      const catalog = catalogRef.current;
      if (!current || !catalog) {
        return;
      }
      let next = current;
      if (next.mode.focusedId !== nodeId) {
        next = reduceInteraction(next, { type: "focus", nodeId });
      }
      next = reduceInteraction(next, { type: "startEditing" });
      void commitInteraction(next);
    },
    [commitInteraction],
  );

  const setDraft = useCallback(
    (value: string) => dispatch({ type: "setDraft", value }),
    [dispatch],
  );
  const commitEdit = useCallback(
    () => dispatch({ type: "commit" }),
    [dispatch],
  );
  const cancelEdit = useCallback(
    () => dispatch({ type: "cancel" }),
    [dispatch],
  );
  const createSibling = useCallback(
    () => dispatch({ type: "createSibling" }),
    [dispatch],
  );
  const createChild = useCallback(
    () => dispatch({ type: "createChild" }),
    [dispatch],
  );
  const createRoot = useCallback(
    () => dispatch({ type: "createRoot" }),
    [dispatch],
  );
  const moveUp = useCallback(() => dispatch({ type: "moveUp" }), [dispatch]);
  const moveDown = useCallback(
    () => dispatch({ type: "moveDown" }),
    [dispatch],
  );
  const moveUnder = useCallback(
    (targetId: string) => dispatch({ type: "moveUnder", targetId }),
    [dispatch],
  );
  const swapWithParent = useCallback(
    () => dispatch({ type: "swapWithParent" }),
    [dispatch],
  );
  const detach = useCallback(() => dispatch({ type: "detach" }), [dispatch]);
  const deleteNode = useCallback(
    () => dispatch({ type: "deleteNode" }),
    [dispatch],
  );
  const setWidth = useCallback(
    (width: number, nodeId?: string) =>
      dispatch({ type: "setWidth", width, nodeId }),
    [dispatch],
  );
  const resetWidth = useCallback(
    () => dispatch({ type: "resetWidth" }),
    [dispatch],
  );
  const setColorSlot = useCallback(
    (slot: ColorSlot) => dispatch({ type: "setColorSlot", slot }),
    [dispatch],
  );

  const updatePalette = useCallback(async (slot: ColorSlot, hex: string) => {
    const repository = repositoryRef.current;
    const catalog = catalogRef.current;
    const interaction = interactionRef.current;
    if (!repository || !catalog || !interaction) {
      return;
    }
    const nextCatalog = updatePaletteSlot(catalog, slot, hex);
    await repository.saveCatalog(nextCatalog);
    catalogRef.current = nextCatalog;
    setState(readyFrom(nextCatalog, interaction, historyRef.current));
  }, []);

  const setLanguage = useCallback(async (language: Language) => {
    const repository = repositoryRef.current;
    const catalog = catalogRef.current;
    const interaction = interactionRef.current;
    if (!repository || !catalog || !interaction) {
      return;
    }
    const nextCatalog = setCatalogLanguage(catalog, language);
    await repository.saveCatalog(nextCatalog);
    catalogRef.current = nextCatalog;
    setState(readyFrom(nextCatalog, interaction, historyRef.current));
  }, []);

  const undo = useCallback(() => {
    const catalog = catalogRef.current;
    if (!catalog || !historyCanUndo(historyRef.current)) {
      return;
    }
    const result = historyUndo(historyRef.current);
    historyRef.current = result.history;
    const next: InteractionSnapshot = {
      map: result.entry.map,
      mode: { kind: "focused", focusedId: result.entry.focusedId },
      dirty: false,
    };
    interactionRef.current = next;
    void repositoryRef.current?.saveMap(next.map);
    setState(readyFrom(catalog, next, historyRef.current));
  }, []);

  const redo = useCallback(() => {
    const catalog = catalogRef.current;
    if (!catalog || !historyCanRedo(historyRef.current)) {
      return;
    }
    const result = historyRedo(historyRef.current);
    historyRef.current = result.history;
    const next: InteractionSnapshot = {
      map: result.entry.map,
      mode: { kind: "focused", focusedId: result.entry.focusedId },
      dirty: false,
    };
    interactionRef.current = next;
    void repositoryRef.current?.saveMap(next.map);
    setState(readyFrom(catalog, next, historyRef.current));
  }, []);

  const typeCharacter = useCallback(
    (value: string) => dispatch({ type: "typeCharacter", value }),
    [dispatch],
  );
  const arrow = useCallback(
    (direction: "up" | "down" | "left" | "right") =>
      dispatch({ type: "arrow", direction }),
    [dispatch],
  );

  return {
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
  };
}
