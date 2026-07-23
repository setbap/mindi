export const SCALE_WARNING_NODE_COUNT = 512;

export interface LayoutScalePolicy {
  warn: boolean;
  defer: boolean;
  animate: boolean;
}

export function layoutScalePolicy(
  nodeCount: number,
  prefersReducedMotion: boolean,
): LayoutScalePolicy {
  const defer = nodeCount > SCALE_WARNING_NODE_COUNT;
  return {
    warn: nodeCount >= SCALE_WARNING_NODE_COUNT,
    defer,
    animate: !prefersReducedMotion && !defer,
  };
}

type Schedule = (callback: () => void) => number;
type Cancel = (id: number) => void;

export interface LatestLayoutScheduler {
  request<T>(task: () => T, publish: (result: T) => void): void;
  cancel(): void;
}

export function createLatestLayoutScheduler(
  schedule: Schedule = requestAnimationFrame,
  cancelScheduled: Cancel = cancelAnimationFrame,
): LatestLayoutScheduler {
  let pendingId: number | null = null;

  return {
    request(task, publish) {
      if (pendingId !== null) {
        cancelScheduled(pendingId);
      }
      pendingId = schedule(() => {
        pendingId = null;
        publish(task());
      });
    },
    cancel() {
      if (pendingId !== null) {
        cancelScheduled(pendingId);
        pendingId = null;
      }
    },
  };
}
