import { useEffect, useState } from "react";
import type { CatalogRecord, MapRecord } from "../domain/types";
import { createMapRepository } from "../persistence/indexed-db-map-repository";

interface BootstrapState {
  status: "loading" | "ready" | "error";
  catalog?: CatalogRecord;
  openMap?: MapRecord;
  error?: string;
}

export function useMindiBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const repository = createMapRepository();
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
  }, []);

  return state;
}
