import { afterEach, describe, expect, it, vi } from "vitest";

import { bindVisibleViewport } from "./bind-visible-viewport";

describe("bindVisibleViewport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("publishes visual viewport height and offset as CSS variables", () => {
    const root = document.createElement("div");
    const listeners = new Map<string, Set<() => void>>();
    const viewport = {
      height: 640,
      offsetTop: 12,
      addEventListener: (type: string, handler: () => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(handler);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, handler: () => void) => {
        listeners.get(type)?.delete(handler);
      },
    };
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const unbind = bindVisibleViewport(root);
    expect(root.style.getPropertyValue("--visible-viewport-height")).toBe(
      "640px",
    );
    expect(root.style.getPropertyValue("--visible-viewport-offset-top")).toBe(
      "12px",
    );

    viewport.height = 400;
    viewport.offsetTop = 24;
    for (const handler of listeners.get("resize") ?? []) {
      handler();
    }
    expect(root.style.getPropertyValue("--visible-viewport-height")).toBe(
      "400px",
    );
    expect(root.style.getPropertyValue("--visible-viewport-offset-top")).toBe(
      "24px",
    );

    unbind();
  });

  it("invokes onSettled once after viewport resize settles", () => {
    vi.useFakeTimers();
    const root = document.createElement("div");
    const listeners = new Map<string, Set<() => void>>();
    const viewport = {
      height: 640,
      offsetTop: 0,
      addEventListener: (type: string, handler: () => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(handler);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, handler: () => void) => {
        listeners.get(type)?.delete(handler);
      },
    };
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    const onSettled = vi.fn();
    const unbind = bindVisibleViewport(root, { onSettled, settleMs: 150 });
    for (const handler of listeners.get("resize") ?? []) {
      handler();
      handler();
    }
    expect(onSettled).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(onSettled).toHaveBeenCalledTimes(1);
    unbind();
    vi.useRealTimers();
  });

  it("is a no-op when VisualViewport is unavailable", () => {
    vi.stubGlobal("visualViewport", undefined);
    const root = document.createElement("div");
    const unbind = bindVisibleViewport(root);
    expect(root.style.getPropertyValue("--visible-viewport-height")).toBe("");
    unbind();
  });
});
