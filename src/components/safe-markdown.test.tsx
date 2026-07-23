import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SafeMarkdown } from "@/components/safe-markdown";

describe("SafeMarkdown", () => {
  it("renders CommonMark and GFM without activating raw HTML", () => {
    render(
      <SafeMarkdown
        markdown={"**Bold** and <script>alert(1)</script>\n\n~~strike~~"}
      />,
    );

    expect(screen.getByText("Bold", { exact: false }).textContent).toContain(
      "Bold",
    );
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/script/i).textContent).toMatch(/script/i);
    expect(screen.getByText("strike").tagName.toLowerCase()).toBe("del");
  });

  it("opens only allowed links outside the app with noopener noreferrer", () => {
    render(
      <SafeMarkdown
        markdown={
          "[safe](https://example.com) [mail](mailto:a@b.com) [bad](javascript:alert(1))"
        }
      />,
    );

    const safe = screen.getByRole("link", { name: "safe" });
    expect(safe).toHaveAttribute("href", "https://example.com");
    expect(safe).toHaveAttribute("target", "_blank");
    expect(safe).toHaveAttribute("rel", "noopener noreferrer");

    const mail = screen.getByRole("link", { name: "mail" });
    expect(mail).toHaveAttribute("href", "mailto:a@b.com");

    expect(screen.queryByRole("link", { name: "bad" })).toBeNull();
    expect(screen.getByText("bad").closest("a")).toBeNull();
  });

  it("renders GFM task lists as display-only", async () => {
    const user = userEvent.setup();
    render(<SafeMarkdown markdown={"- [ ] open\n- [x] done"} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeDisabled();
    expect(boxes[1]).toBeDisabled();
    expect(boxes[1]).toBeChecked();

    await user.click(boxes[0]);
    expect(boxes[0]).not.toBeChecked();
  });

  it("replaces a failed image with an alt-text link to the source", async () => {
    render(
      <SafeMarkdown markdown={"![Diagram](https://example.com/diagram.png)"} />,
    );

    const img = screen.getByRole("img", { name: "Diagram" });
    expect(img).toHaveAttribute("src", "https://example.com/diagram.png");

    img.dispatchEvent(new Event("error"));

    const fallback = await screen.findByRole("link", { name: "Diagram" });
    expect(fallback).toHaveAttribute("href", "https://example.com/diagram.png");
    expect(fallback).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("img", { name: "Diagram" })).toBeNull();
  });

  it("renders offline images as an alt-text link without loading", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");
    Object.defineProperty(Navigator.prototype, "onLine", {
      configurable: true,
      get: () => false,
    });

    try {
      render(
        <SafeMarkdown
          markdown={"![Offline diagram](https://example.com/offline.png)"}
        />,
      );

      expect(screen.queryByRole("img")).toBeNull();
      const fallback = screen.getByRole("link", { name: "Offline diagram" });
      expect(fallback).toHaveAttribute(
        "href",
        "https://example.com/offline.png",
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(Navigator.prototype, "onLine", descriptor);
      } else {
        Reflect.deleteProperty(Navigator.prototype, "onLine");
      }
    }
  });
});
