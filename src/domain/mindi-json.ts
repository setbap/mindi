import { createId, ForestInvariantError } from "./forest";
import type { CatalogRecord, ColorSlot, MapRecord, NodeRecord } from "./types";

export const MINDI_JSON_FORMAT_VERSION = 1;
export const MINDI_JSON_MEDIA_TYPE = "application/vnd.mindi+json";
export const MINDI_JSON_EXTENSION = ".mindi.json";

export interface MindiJsonEnvelope {
  formatVersion: typeof MINDI_JSON_FORMAT_VERSION;
  maps: MapRecord[];
  palette: CatalogRecord["palette"];
}

export interface ParsedMindiImport {
  validMaps: MapRecord[];
  invalidMaps: string[];
  palette: CatalogRecord["palette"];
}

export function serializeMindiExport(
  maps: readonly MapRecord[],
  palette: CatalogRecord["palette"],
): string {
  if (maps.length === 0) {
    throw new ForestInvariantError(
      "A Mindi JSON export must contain at least one Map.",
    );
  }
  return JSON.stringify({
    formatVersion: MINDI_JSON_FORMAT_VERSION,
    maps,
    palette: [...palette],
  });
}

export function parseMindiImport(json: string): ParsedMindiImport {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new ForestInvariantError("The file is not valid JSON.");
  }

  if (!isRecord(value)) {
    throw new ForestInvariantError(
      "The Mindi JSON envelope must be an object.",
    );
  }
  if (value.formatVersion !== MINDI_JSON_FORMAT_VERSION) {
    throw new ForestInvariantError(
      `Unsupported Mindi JSON format version ${String(value.formatVersion)}.`,
    );
  }
  if (!Array.isArray(value.maps) || value.maps.length === 0) {
    throw new ForestInvariantError(
      "The Mindi JSON envelope must contain Maps.",
    );
  }
  const palette = parsePalette(value.palette);
  const validMaps: MapRecord[] = [];
  const invalidMaps: string[] = [];

  value.maps.forEach((map, index) => {
    try {
      validMaps.push(parseMap(map));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Invalid Map.";
      invalidMaps.push(`Map ${index + 1}: ${reason}`);
    }
  });

  if (validMaps.length === 0) {
    throw new ForestInvariantError("The file contains no valid Maps.");
  }
  return { validMaps, invalidMaps, palette };
}

/** Create an additive copy that cannot replace existing Map or Node records. */
export function remapImportedMaps(
  maps: readonly MapRecord[],
  existingNames: Iterable<string>,
): MapRecord[] {
  const names = new Set(existingNames);
  return maps.map((map) => {
    const mapId = createId();
    const nodeIds = new Map(
      Object.keys(map.nodes).map((nodeId) => [nodeId, createId()]),
    );
    const name = importedName(map.name, names);
    names.add(name);
    const nodes = Object.fromEntries(
      Object.entries(map.nodes).map(([oldId, node]) => {
        const id = nodeIds.get(oldId)!;
        return [
          id,
          {
            ...node,
            id,
            parentId:
              node.parentId === null ? null : nodeIds.get(node.parentId)!,
            childIds: node.childIds.map((childId) => nodeIds.get(childId)!),
          },
        ];
      }),
    );
    return {
      id: mapId,
      name,
      rootIds: map.rootIds.map((rootId) => nodeIds.get(rootId)!),
      nodes,
    };
  });
}

function parseMap(value: unknown): MapRecord {
  if (!isRecord(value)) {
    throw new ForestInvariantError("Map must be an object.");
  }
  const id = requiredString(value.id, "Map ID");
  const name = requiredString(value.name, "Map name");
  if (!Array.isArray(value.rootIds) || !value.rootIds.every(isNonEmptyString)) {
    throw new ForestInvariantError("Map Root IDs must be strings.");
  }
  if (!isRecord(value.nodes)) {
    throw new ForestInvariantError("Map Nodes must be an object.");
  }

  const nodes = Object.fromEntries(
    Object.entries(value.nodes).map(([nodeId, node]) => [
      nodeId,
      parseNode(node, nodeId),
    ]),
  );
  const map = { id, name, rootIds: [...value.rootIds], nodes };
  assertOrderedForest(map);
  return map;
}

function parseNode(value: unknown, expectedId: string): NodeRecord {
  if (!isRecord(value)) {
    throw new ForestInvariantError(`Node ${expectedId} must be an object.`);
  }
  const id = requiredString(value.id, `Node ${expectedId} ID`);
  if (id !== expectedId) {
    throw new ForestInvariantError(
      `Node ${expectedId} ID does not match its key.`,
    );
  }
  const markdown = requiredString(value.markdown, `Node ${id} markdown`, true);
  const width = value.width;
  if (
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width < 180 ||
    width > 480
  ) {
    throw new ForestInvariantError(
      `Node ${id} width must be between 180 and 480.`,
    );
  }
  if (!isColorSlot(value.colorSlot)) {
    throw new ForestInvariantError(`Node ${id} has an invalid color slot.`);
  }
  if (value.parentId !== null && !isNonEmptyString(value.parentId)) {
    throw new ForestInvariantError(
      `Node ${id} parent ID must be a string or null.`,
    );
  }
  if (
    !Array.isArray(value.childIds) ||
    !value.childIds.every(isNonEmptyString)
  ) {
    throw new ForestInvariantError(`Node ${id} child IDs must be strings.`);
  }
  return {
    id,
    markdown,
    width,
    colorSlot: value.colorSlot,
    parentId: value.parentId,
    childIds: [...value.childIds],
  };
}

function assertOrderedForest(map: MapRecord): void {
  if (Object.keys(map.nodes).length === 0 || map.rootIds.length === 0) {
    throw new ForestInvariantError(
      "A Map must contain at least one Node and Root.",
    );
  }
  if (new Set(map.rootIds).size !== map.rootIds.length) {
    throw new ForestInvariantError("Map Root IDs must not repeat.");
  }
  const visited = new Set<string>();
  const visit = (nodeId: string, parentId: string | null) => {
    const node = map.nodes[nodeId];
    if (!node) {
      throw new ForestInvariantError(`Node ${nodeId} is missing from the Map.`);
    }
    if (node.parentId !== parentId) {
      throw new ForestInvariantError(
        `Node ${nodeId} has an inconsistent parent.`,
      );
    }
    if (visited.has(nodeId)) {
      throw new ForestInvariantError(
        `Node ${nodeId} appears more than once in the forest.`,
      );
    }
    if (new Set(node.childIds).size !== node.childIds.length) {
      throw new ForestInvariantError(
        `Node ${nodeId} child IDs must not repeat.`,
      );
    }
    visited.add(nodeId);
    node.childIds.forEach((childId) => visit(childId, nodeId));
  };
  map.rootIds.forEach((rootId) => visit(rootId, null));
  if (visited.size !== Object.keys(map.nodes).length) {
    throw new ForestInvariantError("Every Node must be reachable from a Root.");
  }
}

function parsePalette(value: unknown): CatalogRecord["palette"] {
  if (!Array.isArray(value) || value.length !== 9 || !value.every(isHexColor)) {
    throw new ForestInvariantError(
      "Palette must contain nine hexadecimal colors.",
    );
  }
  return [...value] as unknown as CatalogRecord["palette"];
}

function requiredString(
  value: unknown,
  label: string,
  allowEmpty = false,
): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    throw new ForestInvariantError(`${label} must be a non-empty string.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isColorSlot(value: unknown): value is ColorSlot {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  );
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function importedName(
  name: string,
  occupiedNames: ReadonlySet<string>,
): string {
  if (!occupiedNames.has(name)) {
    return name;
  }
  const base = `${name} (imported)`;
  if (!occupiedNames.has(base)) {
    return base;
  }
  let number = 2;
  while (occupiedNames.has(`${base} ${number}`)) {
    number += 1;
  }
  return `${base} ${number}`;
}
