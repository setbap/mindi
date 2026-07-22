import { openDB, type DBSchema, type IDBPDatabase } from "idb";
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
}

export function createMapRepository(): MapRepository {
  return new IndexedDbMapRepository();
}
