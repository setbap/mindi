import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDbMapRepository } from "./indexed-db-map-repository";

describe("IndexedDbMapRepository", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("creates and persists the first Untitled Map on initialize", async () => {
    const repository = new IndexedDbMapRepository();

    const firstLaunch = await repository.initialize();

    expect(firstLaunch.catalog.maps).toHaveLength(1);
    expect(firstLaunch.catalog.openMapId).toBe(firstLaunch.openMap.id);
    expect(firstLaunch.openMap.name).toBe("Untitled Map");
    expect(firstLaunch.openMap.rootIds).toHaveLength(1);
    expect(
      firstLaunch.openMap.nodes[firstLaunch.openMap.rootIds[0]].markdown,
    ).toBe("");
  });

  it("returns the same Map after reopening persistence", async () => {
    const firstRepository = new IndexedDbMapRepository();
    const firstLaunch = await firstRepository.initialize();
    const rootId = firstLaunch.openMap.rootIds[0];

    const secondRepository = new IndexedDbMapRepository();
    const secondLaunch = await secondRepository.initialize();

    expect(secondLaunch.openMap.id).toBe(firstLaunch.openMap.id);
    expect(secondLaunch.openMap.name).toBe("Untitled Map");
    expect(secondLaunch.openMap.rootIds).toEqual([rootId]);
    expect(secondLaunch.openMap.nodes[rootId].markdown).toBe("");
    expect(secondLaunch.catalog.openMapId).toBe(firstLaunch.openMap.id);
  });

  it("loads a Map by id through the repository port", async () => {
    const repository = new IndexedDbMapRepository();
    const { openMap } = await repository.initialize();

    const loaded = await repository.loadMap(openMap.id);

    expect(loaded).toEqual(openMap);
  });
});
