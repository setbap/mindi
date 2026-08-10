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

function canvasNodes() {
  return within(screen.getByTestId("map-canvas")).getAllByTestId(/^node-/);
}

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
    importMaps: vi.fn(async (importedMaps) => {
      maps = [...maps, ...importedMaps];
      return snapshot().catalog;
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

    const canvas = screen.getByTestId("map-canvas");
    canvas.focus();
    await user.keyboard("H");

    const editor = await screen.findByLabelText("Node markdown");
    expect(editor).toHaveValue("H");
    await user.type(editor, "ello");
    expect(editor).toHaveValue("Hello");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(repository.saveMap).toHaveBeenCalled();
      const saved = vi.mocked(repository.saveMap).mock.calls.at(-1)?.[0];
      expect(saved?.nodes[rootId].markdown).toBe("Hello");
    });
    const markdown = within(screen.getByTestId("map-canvas")).getByTestId(
      "safe-markdown",
    );
    expect(within(markdown).getByText("Hello")).toBeInTheDocument();
  });

  it("Enter creates a sibling and Tab creates a child while Focused", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    vi.mocked(createMapRepository).mockReturnValue(
      mockRepository([first], "map-1"),
    );

    render(<App />);
    await waitFor(() => screen.getByTestId("map-canvas"));

    const canvas = screen.getByTestId("map-canvas");
    canvas.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(canvasNodes()).toHaveLength(2);
    });
    expect(screen.queryByLabelText("Node markdown")).not.toBeInTheDocument();

    await user.keyboard("{Tab}");

    await waitFor(() => {
      expect(canvasNodes().length).toBeGreaterThanOrEqual(3);
    });
    expect(screen.queryByLabelText("Node markdown")).not.toBeInTheDocument();
  });
});

describe("App structure commands", () => {
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

  it("creates a Root, detaches a child, and blocks deleting the final Node", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    const repository = mockRepository([first], "map-1");
    vi.mocked(createMapRepository).mockReturnValue(repository);

    render(<App />);
    await waitFor(() => screen.getByTestId("structure-commands"));

    await user.click(screen.getByRole("button", { name: "Create Root" }));
    await waitFor(() => {
      expect(canvasNodes()).toHaveLength(2);
    });
    expect(repository.saveMap).toHaveBeenCalled();

    const canvas = screen.getByTestId("map-canvas");
    canvas.focus();
    await user.keyboard("{Tab}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Detach" })).not.toBeDisabled();
    });
    await user.click(screen.getByRole("button", { name: "Detach" }));

    await waitFor(() => {
      expect(canvasNodes().length).toBeGreaterThanOrEqual(3);
    });

    // Delete until one Node remains
    while (
      screen.queryByRole("button", { name: "Delete" }) &&
      !(screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
        .disabled
    ) {
      const before = canvasNodes().length;
      await user.click(screen.getByRole("button", { name: "Delete" }));
      const confirm = screen.queryByTestId("delete-confirm");
      if (confirm) {
        await user.click(
          within(confirm).getByRole("button", { name: "Delete" }),
        );
      }
      await waitFor(() => {
        expect(canvasNodes().length).toBeLessThan(before);
      });
    }

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(
      screen.getByText(/The final Node cannot be deleted/i),
    ).toBeInTheDocument();
  });
});

describe("App resize, palette, and undo", () => {
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

  it("resizes via accessible command, sets color, and undoes", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    const repository = mockRepository([first], "map-1");
    vi.mocked(createMapRepository).mockReturnValue(repository);

    render(<App />);
    await waitFor(() => screen.getByTestId("style-commands"));

    await user.click(screen.getByRole("button", { name: "Resize" }));
    const widthInput = screen.getByLabelText("Node width");
    await user.clear(widthInput);
    await user.type(widthInput, "360");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(repository.saveMap).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "Color slot 3" }));
    await waitFor(() => {
      const saved = vi.mocked(repository.saveMap).mock.calls.at(-1)?.[0];
      expect(saved?.nodes[first.rootIds[0]].colorSlot).toBe(3);
      expect(saved?.nodes[first.rootIds[0]].width).toBe(360);
    });

    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      const saved = vi.mocked(repository.saveMap).mock.calls.at(-1)?.[0];
      expect(saved?.nodes[first.rootIds[0]].colorSlot).toBe(1);
    });
  });
});

describe("App Node browser", () => {
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

  it("searches Nodes and focuses a result shared with the canvas", async () => {
    const user = userEvent.setup();
    const first = untitledMap("map-1");
    first.nodes[first.rootIds[0]].markdown = "Alpha root";
    const repository = mockRepository([first], "map-1");
    vi.mocked(createMapRepository).mockReturnValue(repository);

    render(<App />);
    await waitFor(() => screen.getByTestId("map-node-browser"));

    const search = screen.getByLabelText("Search nodes");
    await user.type(search, "Alpha");
    expect(
      screen.getByTestId(`browser-node-${first.rootIds[0]}`),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("map-canvas")).toHaveAttribute(
      "aria-activedescendant",
      `canvas-active-${first.rootIds[0]}`,
    );

    await user.clear(search);
    await user.type(search, "zzzz");
    expect(screen.getByText("No matching nodes")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(search).toHaveValue("");
    expect(screen.queryByText("No matching nodes")).not.toBeInTheDocument();
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
