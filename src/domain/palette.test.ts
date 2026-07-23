import { describe, expect, it } from "vitest";

import { createInitialCatalog, createUntitledMap } from "./forest";
import {
  paletteColor,
  setNodeColorSlot,
  updatePaletteSlot,
} from "./palette";
import { DEFAULT_PALETTE } from "./types";

describe("Palette and color slots", () => {
  it("assigns a Color slot on a Node", () => {
    const map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const next = setNodeColorSlot(map, rootId, 5);
    expect(next.nodes[rootId].colorSlot).toBe(5);
  });

  it("looks up live Palette hex by slot", () => {
    const catalog = createInitialCatalog(createUntitledMap("map-1"));
    expect(paletteColor(catalog.palette, 1)).toBe(DEFAULT_PALETTE[0]);
    expect(paletteColor(catalog.palette, 9)).toBe(DEFAULT_PALETTE[8]);
  });

  it("updates a global Palette slot without touching Maps", () => {
    const catalog = createInitialCatalog(createUntitledMap("map-1"));
    const next = updatePaletteSlot(catalog, 3, "#abcdef");
    expect(next.palette[2]).toBe("#abcdef");
    expect(next.maps).toEqual(catalog.maps);
  });
});
