import { ForestInvariantError } from "./forest";
import type { CatalogRecord, ColorSlot, MapRecord } from "./types";

export function setNodeColorSlot(
  map: MapRecord,
  nodeId: string,
  slot: ColorSlot,
): MapRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: { ...node, colorSlot: slot },
    },
  };
}

export function paletteColor(
  palette: CatalogRecord["palette"],
  slot: ColorSlot,
): string {
  return palette[slot - 1];
}

export function updatePaletteSlot(
  catalog: CatalogRecord,
  slot: ColorSlot,
  hex: string,
): CatalogRecord {
  const palette = [...catalog.palette] as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  palette[slot - 1] = hex;
  return { ...catalog, palette };
}
