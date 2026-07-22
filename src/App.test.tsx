import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { DEFAULT_PALETTE } from "./domain/types";

vi.mock("./persistence/indexed-db-map-repository", () => ({
  createMapRepository: vi.fn(),
}));

import { createMapRepository } from "./persistence/indexed-db-map-repository";

describe("App bootstrap", () => {
  beforeEach(() => {
    vi.mocked(createMapRepository).mockReset();
  });

  it("shows the persisted Untitled Map after bootstrap", async () => {
    vi.mocked(createMapRepository).mockReturnValue({
      initialize: vi.fn().mockResolvedValue({
        catalog: {
          schemaVersion: 1,
          maps: [{ id: "map-1", name: "Untitled Map" }],
          openMapId: "map-1",
          palette: [...DEFAULT_PALETTE],
          language: "en",
        },
        openMap: {
          id: "map-1",
          name: "Untitled Map",
          rootIds: ["root-1"],
          nodes: {
            "root-1": {
              id: "root-1",
              markdown: "",
              width: 280,
              colorSlot: 1,
              parentId: null,
              childIds: [],
            },
          },
        },
      }),
      getCatalog: vi.fn(),
      loadMap: vi.fn(),
      saveMap: vi.fn(),
      saveCatalog: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Untitled Map" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.getByText("map-1")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Open Map summary" }),
    ).toBeInTheDocument();
  });
});
