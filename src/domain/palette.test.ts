import { describe, expect, it } from "vitest";

import { createInitialCatalog, createUntitledMap } from "./forest";
import {
  contrastInk,
  contrastRatio,
  NODE_INK_DARK,
  NODE_INK_LIGHT,
  NODE_TEXT_CONTRAST_MIN,
  nodeChrome,
  paletteColor,
  relativeLuminance,
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

describe("contrastInk", () => {
  it("uses dark ink on light fills and light ink on dark fills", () => {
    expect(contrastInk("#ffffff")).toBe(NODE_INK_DARK);
    expect(contrastInk("#fabd2f")).toBe(NODE_INK_DARK);
    expect(contrastInk("#b8bb26")).toBe(NODE_INK_DARK);
    expect(contrastInk("#000000")).toBe(NODE_INK_LIGHT);
    expect(contrastInk("#1d2021")).toBe(NODE_INK_LIGHT);
  });

  it("falls back to light ink for invalid hex", () => {
    expect(contrastInk("not-a-color")).toBe(NODE_INK_LIGHT);
  });

  it("reports relative luminance in 0–1", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("bad")).toBeNull();
  });
});

describe("nodeChrome", () => {
  it("keeps AA text contrast for every default Palette slot", () => {
    for (const hex of DEFAULT_PALETTE) {
      const chrome = nodeChrome(hex);
      const ratio = contrastRatio(chrome.background, chrome.color);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(NODE_TEXT_CONTRAST_MIN);
    }
  });

  it("nudges mid-tone fills until ink is readable", () => {
    const chrome = nodeChrome("#d65d0e");
    expect(chrome.background.toLowerCase()).not.toBe("#d65d0e");
    expect(contrastRatio(chrome.background, chrome.color)!).toBeGreaterThanOrEqual(
      NODE_TEXT_CONTRAST_MIN,
    );
  });
});
