import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialInteraction,
  reduceInteraction,
  type InteractionAction,
  type InteractionMode,
  type InteractionSnapshot,
} from "../domain/interaction";
import type { CatalogRecord, MapRecord } from "../domain/types";
import { createMapRepository } from "../persistence/indexed-db-map-repository";
import type { MapRepository } from "../persistence/map-repository-port";

interface ReadyState {
  status: "ready";
  catalog: CatalogRecord;
  openMap: MapRecord;
  mode: InteractionMode;
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
  focusNode: (nodeId: string) => void;
  startEditing: (nodeId: string) => void;
  setDraft: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  createSibling: () => void;
  createChild: () => void;
  typeCharacter: (value: string) => void;
  arrow: (direction: "up" | "down" | "left" | "right") => void;
}

function readyFrom(
  catalog: CatalogRecord,
  interaction: InteractionSnapshot,
): ReadyState {
  return {
    status: "ready",
    catalog,
    openMap: interaction.map,
    mode: interaction.mode,
  };
}

export function useMindiApp(
  createRepository: () => MapRepository = createMapRepository,
): MindiAppController {
  const [state, setState] = useState<AppState>({ status: "loading" });
  const repositoryRef = useRef<MapRepository | null>(null);
  const interactionRef = useRef<InteractionSnapshot | null>(null);
  const catalogRef = useRef<CatalogRecord | null>(null);

  const commitInteraction = useCallback(async (next: InteractionSnapshot) => {
    interactionRef.current = next;
    if (next.dirty) {
      await repositoryRef.current?.saveMap(next.map);
    }
    const catalog = catalogRef.current;
    if (!catalog) {
      return;
    }
    setState(readyFrom(catalog, next));
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

  useEffect(() => {
    let cancelled = false;
    const repository = createRepository();
    repositoryRef.current = repository;

    async function bootstrap() {
      try {
        const { catalog, openMap } = await repository.initialize();
        if (!cancelled) {
          const interaction = createInitialInteraction(openMap);
          catalogRef.current = catalog;
          interactionRef.current = interaction;
          setState(readyFrom(catalog, interaction));
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
  }, [createRepository]);

  const createMap = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.createMap();
    const interaction = createInitialInteraction(openMap);
    catalogRef.current = catalog;
    interactionRef.current = interaction;
    setState(readyFrom(catalog, interaction));
  }, []);

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

  const switchMap = useCallback(async (mapId: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.switchMap(mapId);
    const interaction = createInitialInteraction(openMap);
    catalogRef.current = catalog;
    interactionRef.current = interaction;
    setState(readyFrom(catalog, interaction));
  }, []);

  const deleteMap = useCallback(async (mapId: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.deleteMap(mapId);
    const interaction = createInitialInteraction(openMap);
    catalogRef.current = catalog;
    interactionRef.current = interaction;
    setState(readyFrom(catalog, interaction));
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
    focusNode,
    startEditing,
    setDraft,
    commitEdit,
    cancelEdit,
    createSibling,
    createChild,
    typeCharacter,
    arrow,
  };
}
