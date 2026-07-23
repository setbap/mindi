import { describe, expect, it } from "vitest";

import { createLargeMapFixture } from "./large-map";

describe("createLargeMapFixture", () => {
  it("creates the same valid 512-Node Map every time", () => {
    const first = createLargeMapFixture();
    const second = createLargeMapFixture();

    expect(Object.keys(first.nodes)).toHaveLength(512);
    expect(first).toEqual(second);
    expect(first.rootIds).toEqual(["node-000"]);
    expect(first.nodes["node-511"].markdown).toBe("Node 512");
  });
});
