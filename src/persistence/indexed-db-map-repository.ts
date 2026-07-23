import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  appendCreatedMap,
  removeMapFromCatalog,
  renameCatalogMap,
  switchOpenMap,
} from "../domain/catalog";
import {
  assertNonEmptyCatalog,
  assertNonEmptyMap,
  createInitialCatalog,
  createUntitledMap,
} from "../domain/forest";
import type { CatalogRecord, MapRecord } from "../domain/types";
import { SCHEMA_VERSION } from "../domain/types";
import type { MapRepository } from "./map-repository-port";

interface MindiDbSchema extends DBSchema {
  catalog: {
    key: "singleton";
    value: CatalogRecord;
  };
  maps: {
    key: string;
    value: MapRecord;
  };
}

const DB_NAME = "mindi";
const DB_VERSION = 1;

async function openMindiDb(): Promise<IDBPDatabase<MindiDbSchema>> {
  return openDB<MindiDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("catalog")) {
        db.createObjectStore("catalog");
      }
      if (!db.objectStoreNames.contains("maps")) {
        db.createObjectStore("maps");
      }
    },
  });
}

export class IndexedDbMapRepository implements MapRepository {
  private readonly openDb: () => Promise<IDBPDatabase<MindiDbSchema>>;

  constructor(
    openDb: () => Promise<IDBPDatabase<MindiDbSchema>> = openMindiDb,
  ) {
    this.openDb = openDb;
  }

  async initialize(): Promise<{ catalog: CatalogRecord; openMap: MapRecord }> {
    const db = await this.openDb();
    const existingCatalog = await db.get("catalog", "singleton");

    if (existingCatalog) {
      assertNonEmptyCatalog(existingCatalog);
      const rememberedId =
        existingCatalog.openMapId ?? existingCatalog.maps[0]?.id;
      if (!rememberedId) {
        throw new Error("Catalog is missing an Open Map ID.");
      }

      let openMap = await db.get("maps", rememberedId);
      let catalog = existingCatalog;

      if (!openMap) {
        const fallbackId = existingCatalog.maps[0]?.id;
        if (!fallbackId) {
          throw new Error("Catalog has no Maps to open.");
        }
        openMap = await db.get("maps", fallbackId);
        if (!openMap) {
          throw new Error(
            `Open Map ${fallbackId} is missing from persistence.`,
          );
        }
        catalog = { ...existingCatalog, openMapId: fallbackId };
        await db.put("catalog", catalog, "singleton");
      }

      assertNonEmptyMap(openMap);
      return { catalog, openMap };
    }

    const openMap = createUntitledMap();
    const catalog = createInitialCatalog(openMap);
    assertNonEmptyMap(openMap);
    assertNonEmptyCatalog(catalog);

    const tx = db.transaction(["catalog", "maps"], "readwrite");
    await tx.objectStore("catalog").put(catalog, "singleton");
    await tx.objectStore("maps").put(openMap, openMap.id);
    await tx.done;

    return { catalog, openMap };
  }

  async getCatalog(): Promise<CatalogRecord> {
    const db = await this.openDb();
    const catalog = await db.get("catalog", "singleton");
    if (!catalog) {
      throw new Error("Catalog has not been initialized.");
    }
    assertNonEmptyCatalog(catalog);
    return catalog;
  }

  async loadMap(mapId: string): Promise<MapRecord | null> {
    const db = await this.openDb();
    const map = await db.get("maps", mapId);
    if (!map) {
      return null;
    }
    assertNonEmptyMap(map);
    return map;
  }

  async saveMap(map: MapRecord): Promise<void> {
    assertNonEmptyMap(map);
    const db = await this.openDb();
    await db.put("maps", map, map.id);
  }

  async saveCatalog(catalog: CatalogRecord): Promise<void> {
    assertNonEmptyCatalog(catalog);
    if (catalog.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Unsupported catalog schema version ${catalog.schemaVersion}.`,
      );
    }
    const db = await this.openDb();
    await db.put("catalog", catalog, "singleton");
  }

  async createMap(): Promise<{ catalog: CatalogRecord; openMap: MapRecord }> {
    const db = await this.openDb();
    const current = await db.get("catalog", "singleton");
    if (!current) {
      throw new Error("Catalog has not been initialized.");
    }

    const openMap = createUntitledMap();
    const catalog = appendCreatedMap(current, openMap);
    assertNonEmptyMap(openMap);
    assertNonEmptyCatalog(catalog);

    const tx = db.transaction(["catalog", "maps"], "readwrite");
    await tx.objectStore("catalog").put(catalog, "singleton");
    await tx.objectStore("maps").put(openMap, openMap.id);
    await tx.done;

    return { catalog, openMap };
  }

  async renameMap(mapId: string, name: string): Promise<CatalogRecord> {
    const db = await this.openDb();
    const current = await db.get("catalog", "singleton");
    if (!current) {
      throw new Error("Catalog has not been initialized.");
    }

    const catalog = renameCatalogMap(current, mapId, name);
    const map = await db.get("maps", mapId);
    if (!map) {
      throw new Error(`Map ${mapId} is missing from persistence.`);
    }

    const renamedMap: MapRecord = { ...map, name: name.trim() };
    assertNonEmptyMap(renamedMap);
    assertNonEmptyCatalog(catalog);

    const tx = db.transaction(["catalog", "maps"], "readwrite");
    await tx.objectStore("catalog").put(catalog, "singleton");
    await tx.objectStore("maps").put(renamedMap, renamedMap.id);
    await tx.done;

    return catalog;
  }

  async switchMap(
    mapId: string,
  ): Promise<{ catalog: CatalogRecord; openMap: MapRecord }> {
    const db = await this.openDb();
    const current = await db.get("catalog", "singleton");
    if (!current) {
      throw new Error("Catalog has not been initialized.");
    }

    const catalog = switchOpenMap(current, mapId);
    const openMap = await db.get("maps", mapId);
    if (!openMap) {
      throw new Error(`Map ${mapId} is missing from persistence.`);
    }

    assertNonEmptyMap(openMap);
    assertNonEmptyCatalog(catalog);
    await db.put("catalog", catalog, "singleton");

    return { catalog, openMap };
  }

  async deleteMap(
    mapId: string,
  ): Promise<{ catalog: CatalogRecord; openMap: MapRecord }> {
    const db = await this.openDb();
    const current = await db.get("catalog", "singleton");
    if (!current) {
      throw new Error("Catalog has not been initialized.");
    }

    const catalog = removeMapFromCatalog(current, mapId);
    const openMapId = catalog.openMapId;
    if (!openMapId) {
      throw new Error("Catalog is missing an Open Map ID after delete.");
    }

    const openMap = await db.get("maps", openMapId);
    if (!openMap) {
      throw new Error(`Open Map ${openMapId} is missing from persistence.`);
    }

    assertNonEmptyMap(openMap);
    assertNonEmptyCatalog(catalog);

    const tx = db.transaction(["catalog", "maps"], "readwrite");
    await tx.objectStore("catalog").put(catalog, "singleton");
    await tx.objectStore("maps").delete(mapId);
    await tx.done;

    return { catalog, openMap };
  }
}

export function createMapRepository(): MapRepository {
  return new IndexedDbMapRepository();
}
