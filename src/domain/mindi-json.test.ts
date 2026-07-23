import { describe, expect, it } from "vitest";
import { createUntitledMap } from "./forest";
import {
  MINDI_JSON_MEDIA_TYPE,
  parseMindiImport,
  remapImportedMaps,
  serializeMindiExport,
} from "./mindi-json";
import { DEFAULT_PALETTE } from "./types";

describe("Mindi JSON", () => {
  it("exports only persistent Map data and a Palette snapshot", () => {
    const map = createUntitledMap("map-1");
    const root = map.nodes[map.rootIds[0]];
    root.markdown = "# Plan";
    root.width = 360;
    root.colorSlot = 4;

    const json = serializeMindiExport([map], DEFAULT_PALETTE);

    expect(JSON.parse(json)).toEqual({
      formatVersion: 1,
      maps: [map],
      palette: DEFAULT_PALETTE,
    });
    expect(MINDI_JSON_MEDIA_TYPE).toBe("application/vnd.mindi+json");
  });

  it("does not serialize an envelope without Maps", () => {
    expect(() => serializeMindiExport([], DEFAULT_PALETTE)).toThrow(
      /at least one Map/i,
    );
  });

  it("keeps valid Maps while reporting invalid Maps", () => {
    const valid = createUntitledMap("source-map");
    valid.name = "Ideas";
    const payload = JSON.stringify({
      formatVersion: 1,
      maps: [valid, { id: "empty", name: "Empty", rootIds: [], nodes: {} }],
      palette: DEFAULT_PALETTE,
    });

    const result = parseMindiImport(payload);

    expect(result.validMaps).toEqual([valid]);
    expect(result.invalidMaps).toHaveLength(1);
  });

  it("rejects malformed envelopes and Maps with invalid ordered forests", () => {
    expect(() => parseMindiImport('{"formatVersion":2,"maps":[]}')).toThrow(
      /format version/i,
    );

    const malformedMap = {
      id: "bad",
      name: "Bad",
      rootIds: ["root"],
      nodes: {
        root: {
          id: "root",
          markdown: "",
          width: 100,
          colorSlot: 1,
          parentId: null,
          childIds: [],
        },
      },
    };
    expect(() =>
      parseMindiImport(
        JSON.stringify({
          formatVersion: 1,
          maps: [malformedMap],
          palette: DEFAULT_PALETTE,
        }),
      ),
    ).toThrow(/no valid Maps/i);
  });

  it("remaps every Map and Node ID and makes colliding names distinct", () => {
    const source = createUntitledMap("source-map");
    source.name = "Ideas";
    const root = source.rootIds[0];
    source.nodes[root].childIds = ["child"];
    source.nodes.child = {
      id: "child",
      markdown: "Child",
      width: 280,
      colorSlot: 2,
      parentId: root,
      childIds: [],
    };

    const [imported] = remapImportedMaps([source], ["Ideas"]);

    expect(imported.id).not.toBe(source.id);
    expect(imported.name).toBe("Ideas (imported)");
    expect(Object.keys(imported.nodes)).not.toContain(root);
    const importedRoot = imported.nodes[imported.rootIds[0]];
    const importedChild = imported.nodes[importedRoot.childIds[0]];
    expect(importedChild.parentId).toBe(importedRoot.id);
  });
});
