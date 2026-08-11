import {
  DEFAULT_MAP_NAME,
  DEFAULT_NODE_WIDTH,
  DEFAULT_PALETTE,
  SCHEMA_VERSION,
  type CatalogRecord,
  type ColorSlot,
  type MapRecord,
  type NodeRecord,
} from "./types";

export class ForestInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForestInvariantError";
  }
}

export function createId(): string {
  return crypto.randomUUID();
}

export function createEmptyRootNode(
  id = createId(),
  colorSlot: ColorSlot = 1,
): NodeRecord {
  return {
    id,
    markdown: "",
    width: DEFAULT_NODE_WIDTH,
    colorSlot,
    parentId: null,
    childIds: [],
  };
}

export function createUntitledMap(mapId = createId()): MapRecord {
  const root = createEmptyRootNode();
  return {
    id: mapId,
    name: DEFAULT_MAP_NAME,
    rootIds: [root.id],
    nodes: {
      [root.id]: root,
    },
  };
}

export function createInitialCatalog(openMap: MapRecord): CatalogRecord {
  assertNonEmptyMap(openMap);
  return {
    schemaVersion: SCHEMA_VERSION,
    maps: [{ id: openMap.id, name: openMap.name }],
    openMapId: openMap.id,
    palette: [...DEFAULT_PALETTE],
    language: "en",
  };
}

export function assertNonEmptyMap(map: MapRecord): void {
  const nodeCount = Object.keys(map.nodes).length;
  if (nodeCount === 0) {
    throw new ForestInvariantError("A Map must contain at least one Node.");
  }

  if (map.rootIds.length === 0) {
    throw new ForestInvariantError("A Map must contain at least one Root.");
  }

  for (const rootId of map.rootIds) {
    const root = map.nodes[rootId];
    if (!root || root.parentId !== null) {
      throw new ForestInvariantError(
        "Every Root ID must reference a Root Node.",
      );
    }
  }

  for (const node of Object.values(map.nodes)) {
    if (node.parentId !== null && !map.nodes[node.parentId]) {
      throw new ForestInvariantError(
        "Every Node parent must exist in the Map.",
      );
    }
  }
}

export function assertNonEmptyCatalog(catalog: CatalogRecord): void {
  if (catalog.maps.length === 0) {
    throw new ForestInvariantError(
      "The Map catalog must contain at least one Map.",
    );
  }
}
