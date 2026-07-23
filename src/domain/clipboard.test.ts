import { describe, expect, it } from "vitest";

import { normalizeClipboardPlainText } from "./clipboard";

describe("normalizeClipboardPlainText", () => {
  it("converts CRLF and bare CR to LF and otherwise preserves text", () => {
    expect(normalizeClipboardPlainText("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
    expect(normalizeClipboardPlainText("  keep  spaces\tand\ttabs  ")).toBe(
      "  keep  spaces\tand\ttabs  ",
    );
    expect(normalizeClipboardPlainText("trailing  ")).toBe("trailing  ");
  });
});
