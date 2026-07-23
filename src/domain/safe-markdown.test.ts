import { describe, expect, it } from "vitest";

import { safeMarkdownUrl } from "./safe-markdown";

describe("safeMarkdownUrl", () => {
  it("allows http, https, and mailto and strips other schemes", () => {
    expect(safeMarkdownUrl("https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(safeMarkdownUrl("http://example.com")).toBe("http://example.com");
    expect(safeMarkdownUrl("mailto:hi@example.com")).toBe(
      "mailto:hi@example.com",
    );
    expect(safeMarkdownUrl("javascript:alert(1)")).toBe("");
    expect(safeMarkdownUrl("data:text/html,hi")).toBe("");
    expect(safeMarkdownUrl("irc://irc.example.com")).toBe("");
    expect(safeMarkdownUrl("/relative")).toBe("");
    expect(safeMarkdownUrl("../escape")).toBe("");
  });
});
