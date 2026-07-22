import { describe, expect, it } from "vitest";
import {
  assertNonEmptyCatalog,
  assertNonEmptyMap,
  createInitialCatalog,
  createUntitledMap,
  ForestInvariantError,
} from "./forest";
import { DEFAULT_PALETTE } from "./types";

describe("createUntitledMap", () => {
  it("creates Untitled Map with one empty Root", () => {
    const map = createUntitledMap("map-1");

    expect(map.id).toBe("map-1");
    expect(map.name).toBe("Untitled Map");
    expect(map.rootIds).toHaveLength(1);

    const rootId = map.rootIds[0];
    const root = map.nodes[rootId];

    expect(root).toMatchObject({
      id: rootId,
      markdown: "",
      width: 280,
      colorSlot: 1,
      parentId: null,
      childIds: [],
    });
  });
});

describe("forest invariants", () => {
  it("rejects an empty Map", () => {
    expect(() =>
      assertNonEmptyMap({
        id: "map-1",
        name: "Untitled Map",
        rootIds: [],
        nodes: {},
      }),
    ).toThrow(ForestInvariantError);
  });

  it("rejects an empty catalog", () => {
    expect(() =>
      assertNonEmptyCatalog({
        schemaVersion: 1,
        maps: [],
        openMapId: null,
        palette: [...DEFAULT_PALETTE],
        language: "en",
      }),
    ).toThrow(ForestInvariantError);
  });

  it("creates a valid initial catalog for the first Map", () => {
    const map = createUntitledMap("map-1");
    const catalog = createInitialCatalog(map);

    expect(catalog.maps).toEqual([{ id: "map-1", name: "Untitled Map" }]);
    expect(catalog.openMapId).toBe("map-1");
    expect(catalog.palette).toHaveLength(9);
    expect(() => assertNonEmptyCatalog(catalog)).not.toThrow();
  });
});
