/**
 * Publish VisualViewport geometry as CSS variables for the mobile shell.
 * Does not move Map Nodes — only shell chrome geometry.
 * Optionally notifies once after geometry settles (debounced).
 */
export function bindVisibleViewport(
  root: HTMLElement,
  options?: { onSettled?: () => void; settleMs?: number },
): () => void {
  const viewport = window.visualViewport;
  if (!viewport) {
    return () => {};
  }

  const settleMs = options?.settleMs ?? 150;
  let frame = 0;
  let settleTimer = 0;

  const publish = () => {
    frame = 0;
    root.style.setProperty(
      "--visible-viewport-height",
      `${viewport.height}px`,
    );
    root.style.setProperty(
      "--visible-viewport-offset-top",
      `${viewport.offsetTop}px`,
    );
  };

  const scheduleSettle = () => {
    if (!options?.onSettled) {
      return;
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      options.onSettled?.();
    }, settleMs);
  };

  const schedule = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(publish);
    }
    scheduleSettle();
  };

  publish();
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  window.addEventListener("orientationchange", schedule);
  return () => {
    viewport.removeEventListener("resize", schedule);
    viewport.removeEventListener("scroll", schedule);
    window.removeEventListener("orientationchange", schedule);
    if (frame) {
      cancelAnimationFrame(frame);
    }
    window.clearTimeout(settleTimer);
  };
}
