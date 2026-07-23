import { describe, expect, it } from "vitest";

import { setCatalogLanguage } from "./catalog";
import { createInitialCatalog, createUntitledMap } from "./forest";

describe("setCatalogLanguage", () => {
  it("persists the Language preference on the catalog", () => {
    const catalog = createInitialCatalog(createUntitledMap("map-1"));
    expect(catalog.language).toBe("en");

    const next = setCatalogLanguage(catalog, "fa");
    expect(next.language).toBe("fa");
    expect(next.maps).toEqual(catalog.maps);
    expect(next.palette).toEqual(catalog.palette);
  });
});
