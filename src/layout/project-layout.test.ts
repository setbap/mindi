import { describe, expect, it } from "vitest";

import { createLastChild } from "@/domain/structure";
import { createUntitledMap } from "@/domain/forest";
import { layoutMap } from "./layout-map";
import { projectLayoutToFlow } from "./project-layout";

describe("projectLayoutToFlow", () => {
  it("projects layout into non-interactive React Flow nodes and edges", () => {
    let map = createUntitledMap("map-1");
    const rootId = map.rootIds[0];
    const created = createLastChild(map, rootId);
    map = created.map;

    const sizes = Object.fromEntries(
      Object.values(map.nodes).map((node) => [
        node.id,
        { width: node.width, height: 48 },
      ]),
    );
    const layout = layoutMap(map, sizes);
    const { nodes, edges } = projectLayoutToFlow(layout, {
      focusedId: rootId,
    });

    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(node.draggable).toBe(false);
      expect(node.selectable).toBe(false);
      expect(node.connectable).toBe(false);
      expect(node.focusable).toBe(false);
      expect(node.style?.pointerEvents).toBe("all");
      expect(node.className).toBe("nopan");
      expect(node.sourcePosition).toBe("right");
      expect(node.targetPosition).toBe("left");
    }

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: rootId,
      target: created.newNodeId,
      type: "smoothstep",
      selectable: false,
      focusable: false,
      interactionWidth: 0,
    });
    expect(edges[0].data?.emphasized).toBe(true);
  });
});
