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

  it("creates, renames, switches, and deletes Maps with persistence", async () => {
    const repository = new IndexedDbMapRepository();
    const first = await repository.initialize();

    const created = await repository.createMap();
    expect(created.catalog.maps).toHaveLength(2);
    expect(created.openMap.name).toBe("Untitled Map");
    expect(created.catalog.openMapId).toBe(created.openMap.id);

    const renamedCatalog = await repository.renameMap(
      created.openMap.id,
      "Notes",
    );
    expect(
      renamedCatalog.maps.find((m) => m.id === created.openMap.id)?.name,
    ).toBe("Notes");

    const switched = await repository.switchMap(first.openMap.id);
    expect(switched.openMap.id).toBe(first.openMap.id);
    expect(switched.catalog.openMapId).toBe(first.openMap.id);

    const afterDelete = await repository.deleteMap(first.openMap.id);
    expect(afterDelete.catalog.maps).toHaveLength(1);
    expect(afterDelete.openMap.id).toBe(created.openMap.id);
    expect(afterDelete.openMap.name).toBe("Notes");

    await expect(repository.deleteMap(created.openMap.id)).rejects.toThrow(
      /final Map cannot be deleted/i,
    );

    const reopened = await new IndexedDbMapRepository().initialize();
    expect(reopened.catalog.maps).toHaveLength(1);
    expect(reopened.openMap.name).toBe("Notes");
  });
});
