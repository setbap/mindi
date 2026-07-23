import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createInitialInteraction } from "./domain/interaction";
import {
  DEFAULT_PALETTE,
  type CatalogRecord,
  type MapRecord,
} from "./domain/types";
import type { MapRepository } from "./persistence/map-repository-port";

vi.mock("./persistence/indexed-db-map-repository", () => ({
  createMapRepository: vi.fn(),
}));

import { createMapRepository } from "./persistence/indexed-db-map-repository";

function untitledMap(id: string, name = "Untitled Map"): MapRecord {
  return {
    id,
    name,
    rootIds: [`root-${id}`],
    nodes: {
      [`root-${id}`]: {
        id: `root-${id}`,
        markdown: "",
        width: 280,
        colorSlot: 1,
        parentId: null,
        childIds: [],
      },
    },
  };
}

function catalogFor(maps: MapRecord[], openMapId: string): CatalogRecord {
  return {
    schemaVersion: 1,
    maps: maps.map((map) => ({ id: map.id, name: map.name })),
    openMapId,
    palette: [...DEFAULT_PALETTE],
    language: "en",
  };
}

function mockRepository(
  initialMaps: MapRecord[],
  openId: string,
): MapRepository {
  let maps = [...initialMaps];
  let openMapId = openId;

  const snapshot = () => ({
    catalog: catalogFor(maps, openMapId),
    openMap: maps.find((map) => map.id === openMapId)!,
  });

  return {
    initialize: vi.fn(async () => snapshot()),
    getCatalog: vi.fn(async () => snapshot().catalog),
    loadMap: vi.fn(async (id) => maps.find((map) => map.id === id) ?? null),
    saveMap: vi.fn(async (map) => {
      maps = maps.map((entry) => (entry.id === map.id ? map : entry));
    }),
    saveCatalog: vi.fn(),
    createMap: vi.fn(async () => {
      const created = untitledMap(`map-${maps.length + 1}`);
      maps = [...maps, created];
      openMapId = created.id;
      return snapshot();
    }),
    renameMap: vi.fn(async (mapId, name) => {
      maps = maps.map((map) =>
        map.id === mapId ? { ...map, name: name.trim() } : map,
      );
      return snapshot().catalog;
    }),
    switchMap: vi.fn(async (mapId) => {
      openMapId = mapId;
      return snapshot();
    }),
    deleteMap: vi.fn(async (mapId) => {
      if (maps.length <= 1) {
        throw new Error(
          "The final Map cannot be deleted. Create another Map first.",
        );
      }
      const index = maps.findIndex((map) => map.id === mapId);
      maps = maps.filter((map) => map.id !== mapId);
      if (openMapId === mapId) {
        openMapId = maps[Math.min(index, maps.length - 1)].id;
      }
      return snapshot();
    }),
  };
}

describe("App Focused and Editing", () => {
  beforeEach(() => {
    vi.mocked(createMapRepository).mockReset();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("focuses the Root, edits markdown, and persists on commit", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    const repository = mockRepository([first], "map-1");
    vi.mocked(createMapRepository).mockReturnValue(repository);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Untitled Map" }),
      ).toBeInTheDocument();
    });

    const rootId = first.rootIds[0];
    expect(createInitialInteraction(first).mode.focusedId).toBe(rootId);

    const forest = screen.getByTestId("map-forest");
    forest.focus();
    await user.keyboard("H");

    const editor = await screen.findByLabelText("Node markdown");
    expect(editor).toHaveValue("H");
    await user.type(editor, "ello");
    expect(editor).toHaveValue("Hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
    expect(repository.saveMap).toHaveBeenCalled();
  });

  it("Enter creates a sibling and Tab creates a child while Focused", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    vi.mocked(createMapRepository).mockReturnValue(
      mockRepository([first], "map-1"),
    );

    render(<App />);
    await waitFor(() => screen.getByTestId("map-forest"));

    const forest = screen.getByTestId("map-forest");
    forest.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getAllByRole("treeitem")).toHaveLength(2);
    });

    await user.keyboard("{Escape}");
    forest.focus();
    await user.keyboard("{Tab}");

    await waitFor(() => {
      expect(screen.getAllByRole("treeitem").length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("App Map manager", () => {
  beforeEach(() => {
    vi.mocked(createMapRepository).mockReset();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("creates, renames, switches, and blocks deleting the final Map", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    vi.mocked(createMapRepository).mockReturnValue(
      mockRepository([first], "map-1"),
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Untitled Map" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Maps" }));
    expect(screen.getByTestId("map-manager-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Map" }));
    await waitFor(() => {
      expect(
        within(screen.getByRole("list", { name: "Map catalog" })).getAllByRole(
          "listitem",
        ),
      ).toHaveLength(2);
    });

    const catalog = screen.getByRole("list", { name: "Map catalog" });
    const rows = within(catalog).getAllByRole("listitem");
    await user.click(within(rows[1]).getByRole("button", { name: "Rename" }));
    const renameInput = screen.getByLabelText(/Rename Untitled Map/i);
    await user.clear(renameInput);
    await user.type(renameInput, "Notes");
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Notes" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Maps" }));
    const catalogAgain = screen.getByRole("list", { name: "Map catalog" });
    const firstRow = within(catalogAgain).getAllByRole("listitem")[0];
    await user.click(within(firstRow).getByRole("button", { name: "Switch" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Untitled Map" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Maps" }));
    const openManager = screen.getByRole("list", { name: "Map catalog" });
    const notesRow = within(openManager).getAllByRole("listitem")[1];
    await user.click(within(notesRow).getByRole("button", { name: "Delete" }));
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Untitled Map" }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Maps" }));
    expect(
      screen.getByText(/The final Map cannot be deleted/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
