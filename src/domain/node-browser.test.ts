import { describe, expect, it } from "vitest";

import { createUntitledMap } from "./forest";
import {
  buildBrowserForest,
  plainTextFromMarkdown,
  searchNodes,
} from "./node-browser";
import { createLastChild, createSiblingBelow } from "./structure";
import type { MapRecord } from "./types";

function label(map: MapRecord, id: string, markdown: string): MapRecord {
  return {
    ...map,
    nodes: { ...map.nodes, [id]: { ...map.nodes[id], markdown } },
  };
}

function sampleMap(): { map: MapRecord; a: string; b: string; c: string } {
  let map = createUntitledMap("map-1");
  const a = map.rootIds[0];
  map = label(map, a, "Alpha root");
  const child = createLastChild(map, a);
  map = label(child.map, child.newNodeId, "Beta child");
  const b = child.newNodeId;
  const sib = createSiblingBelow(map, b);
  map = label(sib.map, sib.newNodeId, "Gamma note");
  const c = sib.newNodeId;
  return { map, a, b, c };
}

describe("plainTextFromMarkdown", () => {
  it("strips simple Markdown markers for search/names", () => {
    expect(plainTextFromMarkdown("**Bold** and _italic_")).toBe(
      "Bold and italic",
    );
    expect(plainTextFromMarkdown("# Heading")).toBe("Heading");
  });
});

describe("buildBrowserForest", () => {
  it("walks Roots and children in persisted order", () => {
    const { map, a, b, c } = sampleMap();
    const forest = buildBrowserForest(map);
    expect(forest.map((n) => n.id)).toEqual([a, b, c]);
    expect(forest.find((n) => n.id === b)?.ancestorIds).toEqual([a]);
    expect(forest.find((n) => n.id === c)?.ancestorIds).toEqual([a]);
  });
});

describe("searchNodes", () => {
  it("returns the full forest for an empty query", () => {
    const { map, a, b, c } = sampleMap();
    const result = searchNodes(map, "");
    expect(result.kind).toBe("forest");
    if (result.kind === "forest") {
      expect(result.visibleIds).toEqual([a, b, c]);
    }
  });

  it("ranks prefix matches before substring matches in traversal order", () => {
    let map = createUntitledMap("map-1");
    const root = map.rootIds[0];
    map = label(map, root, "note Alpha");
    const first = createLastChild(map, root);
    map = label(first.map, first.newNodeId, "Alpha first");
    const second = createSiblingBelow(map, first.newNodeId);
    map = label(second.map, second.newNodeId, "has Alpha mid");

    const result = searchNodes(map, "alpha");
    expect(result.kind).toBe("results");
    if (result.kind === "results") {
      expect(result.matches.map((m) => m.id)).toEqual([
        first.newNodeId,
        root,
        second.newNodeId,
      ]);
      expect(result.matches[0].rank).toBe("prefix");
      expect(result.matches[1].rank).toBe("substring");
    }
  });

  it("includes ancestor paths for matches and reports no matches", () => {
    const { map, a, b } = sampleMap();
    const hit = searchNodes(map, "Beta");
    expect(hit.kind).toBe("results");
    if (hit.kind === "results") {
      expect(hit.matches).toHaveLength(1);
      expect(hit.matches[0].id).toBe(b);
      expect(hit.matches[0].ancestorIds).toEqual([a]);
      expect(hit.visibleIds).toEqual([a, b]);
    }

    const miss = searchNodes(map, "zzzz");
    expect(miss.kind).toBe("empty");
  });
});
