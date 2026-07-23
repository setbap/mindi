import { describe, expect, it, vi } from "vitest";

import {
  createLatestLayoutScheduler,
  layoutScalePolicy,
  SCALE_WARNING_NODE_COUNT,
} from "./scale-policy";

describe("layout scale safeguards", () => {
  it("warns at 512 Nodes and defers with animation disabled above it", () => {
    expect(SCALE_WARNING_NODE_COUNT).toBe(512);
    expect(layoutScalePolicy(511, false)).toEqual({
      warn: false,
      defer: false,
      animate: true,
    });
    expect(layoutScalePolicy(512, false)).toEqual({
      warn: true,
      defer: false,
      animate: true,
    });
    expect(layoutScalePolicy(513, false)).toEqual({
      warn: true,
      defer: true,
      animate: false,
    });
    expect(layoutScalePolicy(20, true).animate).toBe(false);
  });

  it("coalesces pending layout work to the latest request", () => {
    const callbacks = new Map<number, () => void>();
    let nextId = 0;
    const cancel = vi.fn((id: number) => callbacks.delete(id));
    const scheduler = createLatestLayoutScheduler((callback) => {
      nextId += 1;
      callbacks.set(nextId, callback);
      return nextId;
    }, cancel);
    const publish = vi.fn();

    scheduler.request(() => "stale", publish);
    scheduler.request(() => "latest", publish);
    callbacks.forEach((callback) => callback());

    expect(cancel).toHaveBeenCalledWith(1);
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith("latest");
  });
});
