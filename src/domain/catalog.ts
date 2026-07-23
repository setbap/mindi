import { ForestInvariantError } from "./forest";
import type { CatalogRecord, MapRecord } from "./types";

export class CatalogCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogCommandError";
  }
}

export function canDeleteMap(catalog: CatalogRecord): boolean {
  return catalog.maps.length > 1;
}

/** After deleting `deletedId`, choose the next Open Map: next entry, else previous. */
export function openMapIdAfterDelete(
  catalog: CatalogRecord,
  deletedId: string,
): string {
  const index = catalog.maps.findIndex((entry) => entry.id === deletedId);
  if (index === -1) {
    throw new CatalogCommandError(`Map ${deletedId} is not in the catalog.`);
  }

  const remaining = catalog.maps.filter((entry) => entry.id !== deletedId);
  if (remaining.length === 0) {
    throw new ForestInvariantError(
      "The Map catalog must contain at least one Map.",
    );
  }

  if (catalog.openMapId !== deletedId) {
    return catalog.openMapId ?? remaining[0].id;
  }

  return remaining[Math.min(index, remaining.length - 1)].id;
}

export function renameCatalogMap(
  catalog: CatalogRecord,
  mapId: string,
  name: string,
): CatalogRecord {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new CatalogCommandError("Map name cannot be empty.");
  }

  const maps = catalog.maps.map((entry) =>
    entry.id === mapId ? { ...entry, name: trimmed } : entry,
  );

  if (!maps.some((entry) => entry.id === mapId)) {
    throw new CatalogCommandError(`Map ${mapId} is not in the catalog.`);
  }

  return { ...catalog, maps };
}

export function switchOpenMap(
  catalog: CatalogRecord,
  mapId: string,
): CatalogRecord {
  if (!catalog.maps.some((entry) => entry.id === mapId)) {
    throw new CatalogCommandError(`Map ${mapId} is not in the catalog.`);
  }
  return { ...catalog, openMapId: mapId };
}

export function appendCreatedMap(
  catalog: CatalogRecord,
  map: MapRecord,
): CatalogRecord {
  return {
    ...catalog,
    maps: [...catalog.maps, { id: map.id, name: map.name }],
    openMapId: map.id,
  };
}

export function removeMapFromCatalog(
  catalog: CatalogRecord,
  mapId: string,
): CatalogRecord {
  if (!canDeleteMap(catalog)) {
    throw new CatalogCommandError(
      "The final Map cannot be deleted. Create another Map first.",
    );
  }

  const nextOpenMapId = openMapIdAfterDelete(catalog, mapId);
  const maps = catalog.maps.filter((entry) => entry.id !== mapId);

  return {
    ...catalog,
    maps,
    openMapId: nextOpenMapId,
  };
}
