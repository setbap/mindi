import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogRecord, MapRecord } from "../domain/types";
import { createMapRepository } from "../persistence/indexed-db-map-repository";
import type { MapRepository } from "../persistence/map-repository-port";

interface ReadyState {
  status: "ready";
  catalog: CatalogRecord;
  openMap: MapRecord;
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
}

export function useMindiApp(
  createRepository: () => MapRepository = createMapRepository,
): MindiAppController {
  const [state, setState] = useState<AppState>({ status: "loading" });
  const repositoryRef = useRef<MapRepository | null>(null);

  useEffect(() => {
    let cancelled = false;
    const repository = createRepository();
    repositoryRef.current = repository;

    async function bootstrap() {
      try {
        const { catalog, openMap } = await repository.initialize();
        if (!cancelled) {
          setState({ status: "ready", catalog, openMap });
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
    setState({ status: "ready", catalog, openMap });
  }, []);

  const renameMap = useCallback(async (mapId: string, name: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const catalog = await repository.renameMap(mapId, name);
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
      return { status: "ready", catalog, openMap };
    });
  }, []);

  const switchMap = useCallback(async (mapId: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.switchMap(mapId);
    setState({ status: "ready", catalog, openMap });
  }, []);

  const deleteMap = useCallback(async (mapId: string) => {
    const repository = repositoryRef.current;
    if (!repository) {
      return;
    }
    const { catalog, openMap } = await repository.deleteMap(mapId);
    setState({ status: "ready", catalog, openMap });
  }, []);

  return { state, createMap, renameMap, switchMap, deleteMap };
}
