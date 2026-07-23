import type { CatalogRecord, MapRecord } from "../domain/types";

export interface MapRepository {
  initialize(): Promise<{ catalog: CatalogRecord; openMap: MapRecord }>;
  getCatalog(): Promise<CatalogRecord>;
  loadMap(mapId: string): Promise<MapRecord | null>;
  saveMap(map: MapRecord): Promise<void>;
  saveCatalog(catalog: CatalogRecord): Promise<void>;
  createMap(): Promise<{ catalog: CatalogRecord; openMap: MapRecord }>;
  renameMap(mapId: string, name: string): Promise<CatalogRecord>;
  switchMap(
    mapId: string,
  ): Promise<{ catalog: CatalogRecord; openMap: MapRecord }>;
  deleteMap(
    mapId: string,
  ): Promise<{ catalog: CatalogRecord; openMap: MapRecord }>;
}
