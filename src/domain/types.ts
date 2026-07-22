export type ColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Language = "en" | "fa";

export interface NodeRecord {
  id: string;
  markdown: string;
  width: number;
  colorSlot: ColorSlot;
  parentId: string | null;
  childIds: string[];
}

export interface MapRecord {
  id: string;
  name: string;
  rootIds: string[];
  nodes: Record<string, NodeRecord>;
}

export interface MapCatalogEntry {
  id: string;
  name: string;
}

export interface CatalogRecord {
  schemaVersion: number;
  maps: MapCatalogEntry[];
  openMapId: string | null;
  palette: readonly [
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
  language: Language;
}

export const SCHEMA_VERSION = 1;
export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_MAP_NAME = "Untitled Map";

export const DEFAULT_PALETTE = [
  "#fb4934",
  "#fe8019",
  "#fabd2f",
  "#b8bb26",
  "#8ec07c",
  "#83a598",
  "#d3869b",
  "#d65d0e",
  "#928374",
] as const satisfies CatalogRecord["palette"];
