import { describe, expect, it } from "vitest";
import {
  appendCreatedMap,
  canDeleteMap,
  CatalogCommandError,
  openMapIdAfterDelete,
  removeMapFromCatalog,
  renameCatalogMap,
  switchOpenMap,
} from "./catalog";
import { createUntitledMap } from "./forest";
import { DEFAULT_PALETTE } from "./types";
import type { CatalogRecord } from "./types";

function catalogWithMaps(names: string[], openIndex = 0): CatalogRecord {
  const maps = names.map((name, i) => ({ id: `map-${i}`, name }));
  return {
    schemaVersion: 1,
    maps,
    openMapId: maps[openIndex]?.id ?? null,
    palette: [...DEFAULT_PALETTE],
    language: "en",
  };
}

describe("catalog commands", () => {
  it("disables delete when only one Map remains", () => {
    expect(canDeleteMap(catalogWithMaps(["Untitled Map"]))).toBe(false);
    expect(canDeleteMap(catalogWithMaps(["A", "B"]))).toBe(true);
  });

  it("renames a Map in the catalog", () => {
    const catalog = renameCatalogMap(
      catalogWithMaps(["Untitled Map"]),
      "map-0",
      "  Research  ",
    );
    expect(catalog.maps[0].name).toBe("Research");
  });

  it("rejects empty rename", () => {
    expect(() =>
      renameCatalogMap(catalogWithMaps(["Untitled Map"]), "map-0", "   "),
    ).toThrow(CatalogCommandError);
  });

  it("switches the Open Map", () => {
    const catalog = switchOpenMap(catalogWithMaps(["A", "B"], 0), "map-1");
    expect(catalog.openMapId).toBe("map-1");
  });

  it("appends a created Untitled Map and opens it", () => {
    const created = createUntitledMap("map-new");
    const catalog = appendCreatedMap(catalogWithMaps(["A"]), created);
    expect(catalog.maps).toHaveLength(2);
    expect(catalog.maps[1]).toEqual({ id: "map-new", name: "Untitled Map" });
    expect(catalog.openMapId).toBe("map-new");
  });

  it("after deleting the Open Map, opens the next Map when available", () => {
    expect(
      openMapIdAfterDelete(catalogWithMaps(["A", "B", "C"], 0), "map-0"),
    ).toBe("map-1");
  });

  it("after deleting the last Open Map, opens the previous Map", () => {
    expect(
      openMapIdAfterDelete(catalogWithMaps(["A", "B", "C"], 2), "map-2"),
    ).toBe("map-1");
  });

  it("refuses to remove the final Map", () => {
    expect(() =>
      removeMapFromCatalog(catalogWithMaps(["Only"]), "map-0"),
    ).toThrow(CatalogCommandError);
  });

  it("removes a Map and updates the Open Map ID", () => {
    const catalog = removeMapFromCatalog(
      catalogWithMaps(["A", "B", "C"], 1),
      "map-1",
    );
    expect(catalog.maps.map((m) => m.id)).toEqual(["map-0", "map-2"]);
    expect(catalog.openMapId).toBe("map-2");
  });
});
