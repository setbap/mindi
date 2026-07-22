import type { CatalogRecord, MapRecord } from "../domain/types";

export interface MapRepository {
  initialize(): Promise<{ catalog: CatalogRecord; openMap: MapRecord }>;
  getCatalog(): Promise<CatalogRecord>;
  loadMap(mapId: string): Promise<MapRecord | null>;
  saveMap(map: MapRecord): Promise<void>;
  saveCatalog(catalog: CatalogRecord): Promise<void>;
}
