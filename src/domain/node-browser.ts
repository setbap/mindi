import type { MapRecord } from "./types";

export interface BrowserNode {
  id: string;
  depth: number;
  ancestorIds: string[];
  label: string;
}

export type SearchRank = "prefix" | "substring";

export interface SearchMatch extends BrowserNode {
  rank: SearchRank;
}

export type SearchResult =
  | { kind: "forest"; visibleIds: string[]; nodes: BrowserNode[] }
  | {
      kind: "results";
      visibleIds: string[];
      matches: SearchMatch[];
      nodes: BrowserNode[];
    }
  | { kind: "empty"; visibleIds: string[]; nodes: BrowserNode[] };

/** Derive plain text for names/search from raw Markdown. */
export function plainTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .trim();
}

export function nodeLabel(markdown: string): string {
  const plain = plainTextFromMarkdown(markdown);
  return plain.length > 0 ? plain : "Empty Node";
}

/** Depth-first walk in Root / sibling order. */
export function buildBrowserForest(map: MapRecord): BrowserNode[] {
  const nodes: BrowserNode[] = [];

  function walk(ids: string[], ancestors: string[]) {
    for (const id of ids) {
      const node = map.nodes[id];
      if (!node) {
        continue;
      }
      nodes.push({
        id,
        depth: ancestors.length,
        ancestorIds: [...ancestors],
        label: nodeLabel(node.markdown),
      });
      walk(node.childIds, [...ancestors, id]);
    }
  }

  walk(map.rootIds, []);
  return nodes;
}

export function searchNodes(map: MapRecord, query: string): SearchResult {
  const forest = buildBrowserForest(map);
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return {
      kind: "forest",
      visibleIds: forest.map((n) => n.id),
      nodes: forest,
    };
  }

  const needle = trimmed.toLowerCase();
  const matches: SearchMatch[] = [];

  for (const node of forest) {
    const haystack = node.label.toLowerCase();
    if (haystack.startsWith(needle)) {
      matches.push({ ...node, rank: "prefix" });
    } else if (haystack.includes(needle)) {
      matches.push({ ...node, rank: "substring" });
    }
  }

  matches.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank === "prefix" ? -1 : 1;
    }
    return 0; // stable: preserve forest traversal order
  });

  if (matches.length === 0) {
    return { kind: "empty", visibleIds: [], nodes: [] };
  }

  const include = new Set<string>();
  for (const match of matches) {
    include.add(match.id);
    for (const ancestorId of match.ancestorIds) {
      include.add(ancestorId);
    }
  }

  const nodes = forest.filter((n) => include.has(n.id));
  return {
    kind: "results",
    visibleIds: nodes.map((n) => n.id),
    matches,
    nodes,
  };
}
