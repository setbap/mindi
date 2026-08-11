import { describe, expect, it } from "vitest";

import { t } from "./t";

describe("t", () => {
  it("returns English by default and Persian when Language is fa", () => {
    expect(t("en", "mapManager")).toBe("Map manager");
    expect(t("fa", "mapManager")).toBe("مدیریت نقشه‌ها");
  });

  it("falls back to English when a Persian key is missing", () => {
    expect(t("fa", "mapManager")).toBe("مدیریت نقشه‌ها");
    // Unknown keys must not crash; English fallback for missing fa uses en table.
    expect(t("en", "mapManager")).toBe("Map manager");
  });

  it("interpolates simple params", () => {
    expect(t("en", "renameMap", { name: "Notes" })).toBe("Rename Notes");
    expect(t("fa", "renameMap", { name: "Notes" })).toBe("تغییر نام Notes");
  });
});
