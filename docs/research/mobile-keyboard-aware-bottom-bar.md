# Mobile keyboard-aware bottom action bar

**Ticket:** Research mobile keyboard-aware bottom action bar  
**Scope:** A compact action bar over a React Flow mind-map that remains usable while a Node editor has the on-screen keyboard open, on iOS and Android browsers.  
**Date:** 2026-07-18  
**Sources:** MDN, W3C specifications, and React Flow's official documentation only.

## Recommendation

Make the action bar a normal DOM sibling of the React Flow canvas, not a node, `Panel`, or `ViewportPortal` child. Give the app shell an explicit available height and reserve a bottom lane for the bar. Use a layered strategy:

1. Declare `interactive-widget=resizes-content`; where supported, this makes the app's layout viewport (and therefore the canvas container) shrink for the keyboard.
2. Always use safe-area padding. It protects controls on devices with non-rectangular displays and harmlessly becomes zero on ordinary displays.
3. Feature-detect `window.visualViewport` and update one CSS custom property from its `height` and `offsetTop` on both `resize` and `scroll`. This is the cross-browser fallback, including browsers that do not honor `interactive-widget` as expected.
4. Do **not** opt into `navigator.virtualKeyboard.overlaysContent` for the initial product. It intentionally disables automatic viewport resizing and requires the application to own all keyboard geometry; the API is experimental and not Baseline. It can be a progressive enhancement later, using `keyboard-inset-height` plus its geometry event.

This has one position authority: CSS lays out the action bar; JavaScript merely publishes the visible viewport measurement when CSS/browser resizing is insufficient. React Flow receives the remaining canvas area and must be told to refit only after the size has settled.

## Browser contract and layout shape

Use this viewport declaration in the document head:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
>
```

`interactive-widget` controls whether a virtual keyboard resizes the visual viewport, layout viewport, or overlays both; `resizes-visual` is the default, while `resizes-content` changes the initial containing block and viewport-relative sizing. `viewport-fit=cover` enables full-screen layout, so essential controls must also observe safe-area insets. [MDN: viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)

Structure the app as two siblings: a `main` canvas region and a semantic `footer`/`nav` action bar. The bar must not live inside the transformed React Flow viewport: `ViewportPortal` content pans and zooms with Nodes and edges, while `Panel` is an overlay associated with the flow. A bottom action bar belongs to the application shell instead. [React Flow components](https://reactflow.dev/api-reference/components)

```css
:root {
  /* JS replaces this only when VisualViewport is available. */
  --visible-viewport-height: 100dvh;
  --visible-viewport-offset-top: 0px;
  --bottom-safe: env(safe-area-inset-bottom, 0px);
  --bar-gap: 0.5rem;
}

.app-shell {
  block-size: var(--visible-viewport-height);
  min-block-size: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  /* Position the shell within the currently visible region if it has moved. */
  transform: translateY(var(--visible-viewport-offset-top));
}

.map-canvas {
  min-block-size: 0;
  min-inline-size: 0;
}

.bottom-actions {
  display: flex;
  gap: var(--bar-gap);
  padding: 0.5rem 0.75rem calc(0.5rem + var(--bottom-safe));
}
```

`dvh` is preferable to legacy `vh` as the CSS-only baseline: `vh` is equivalent to the large viewport height and can be obscured by dynamic browser UI, while `dvh` represents the dynamic viewport. Dynamic units can themselves resize during browser-chrome scrolling, which is why the bar should be compact and the application should not animate every size update. [MDN: CSS length units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)

The `env()` fallback is intentional. The CSS environment-variable spec defines its fallback as the value used when the variable does not exist. Safe-area insets describe the rectangle within which content is visible; their normal rectangular-display value is zero. [CSS Environment Variables Level 1](https://www.w3.org/TR/css-env-1/), [MDN: `env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)

## VisualViewport fallback

The mobile web has distinct layout and visual viewports. An on-screen keyboard may shrink the visual viewport without changing the layout viewport, so a fixed element can otherwise remain behind it. `VisualViewport` provides `height`, `offsetTop`, `resize`, and `scroll` specifically for positioning UI relative to what is actually visible. [MDN: VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)

Install this browser-only effect once at the application root. Batch updates with `requestAnimationFrame`; remove listeners on unmount. Do not infer "keyboard open" from a magic pixel threshold—the authoritative result needed here is the visible rectangle, whether the change came from the keyboard, pinch zoom, browser chrome, or rotation.

```ts
function bindVisibleViewport(root: HTMLElement): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};

  let frame = 0;
  const publish = () => {
    frame = 0;
    root.style.setProperty('--visible-viewport-height', `${viewport.height}px`);
    root.style.setProperty('--visible-viewport-offset-top', `${viewport.offsetTop}px`);
  };
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(publish);
  };

  publish();
  viewport.addEventListener('resize', schedule);
  viewport.addEventListener('scroll', schedule);
  window.addEventListener('orientationchange', schedule);
  return () => {
    viewport.removeEventListener('resize', schedule);
    viewport.removeEventListener('scroll', schedule);
    window.removeEventListener('orientationchange', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
```

MDN's device-fixed example similarly reads the visual viewport on both events and offsets a fixed bottom bar by the visible viewport's position. It also notes that the top-level window is the useful viewport: an iframe's visual metrics correspond to its layout metrics. [MDN: VisualViewport positioning example](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport#simulating_position_device-fixed)

Use `offsetTop` only to position the *shell* relative to the visual viewport. Do not apply it to the persisted Map, Nodes, or React Flow's stored viewport: it is transient browser geometry, not user navigation state.

## Optional VirtualKeyboard enhancement—not baseline

Only in a measured, separately tested enhancement may the app opt into content overlaying:

```ts
if ('virtualKeyboard' in navigator) {
  navigator.virtualKeyboard.overlaysContent = true;
}
```

With that opt-in, the browser stops resizing the viewport and the app becomes responsible for avoiding the keyboard. The API exposes `boundingRect`, a `geometrychange` event, and CSS variables such as `keyboard-inset-height`; the value falls back to `0px` when unavailable/hidden. [MDN: VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API), [W3C VirtualKeyboard specification](https://www.w3.org/TR/virtual-keyboard/)

If this mode is ever adopted, replace—not stack—the VisualViewport placement path:

```css
.bottom-actions {
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  margin-bottom: env(keyboard-inset-height, 0px);
}
```

The keyboard API is not the portable fallback. MDN marks `overlaysContent` as limited availability/experimental, so setting it globally would trade the browser's native behavior for an unsupported custom responsibility on affected platforms. [MDN: `VirtualKeyboard.overlaysContent`](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard/overlaysContent)

## Editing and focus lifecycle

- Focus the Node editor only after it is rendered. Listen for `focusin`/`focusout` at the app root to add an editing class for visual treatment, not to calculate keyboard size.
- On commit/cancel, save or discard according to the editing command, return focus to the Node's semantic control, and let the bar return through the same viewport events. Do not call `blur()` merely to make room for the action bar.
- Leave browser zoom enabled. Disabling `user-scalable` prevents people with low vision from reading content and conflicts with WCAG guidance. [MDN: viewport meta accessibility warning](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- Keep the bar to essential actions during editing (for example, confirm/cancel) and make all actions reachable by keyboard. The map remains pannable only outside the editor's direct text interaction.

## React Flow-specific safeguards

React Flow's parent must have an actual width and height. The `map-canvas` grid region above supplies that; do not use an unconstrained wrapper or let the bar overlap the renderer without reserving space. [React Flow: common errors](https://reactflow.dev/learn/troubleshooting/common-errors)

When the shell size changes, do **not** change Node positions to compensate. Schedule one `fitView` or focused-Node visibility check *after* the resize settles, only when the focused Node is now obscured. React Flow's `fitView` operates from the supplied bounds and optional padding, and `viewportInitialized` tells callers when its DOM viewport exists. [ReactFlowInstance](https://reactflow.dev/api-reference/types/react-flow-instance)

If text editing changes a custom Node's measured dimensions, wait for React Flow measurement before recomputing the Dagre layout. `useNodesInitialized()` goes false when a Node is added and true after measured dimensions are available. If editing changes handles, call `useUpdateNodeInternals`; React Flow requires it to update internal dimensions and handle positions. [React Flow: `useNodesInitialized`](https://reactflow.dev/api-reference/hooks/use-nodes-initialized), [React Flow: `useUpdateNodeInternals`](https://reactflow.dev/api-reference/hooks/use-update-node-internals)

Avoid a `ViewportPortal` for the bar: its content intentionally shares the canvas coordinate system and is affected by pan/zoom. Avoid updating React Flow state on every `visualViewport.scroll`; publish CSS geometry per animation frame and run React Flow visibility logic only after the interaction ends/debounces.

## Acceptance checks

Test on a real or emulated recent iOS browser and Android browser, in portrait and landscape:

1. Focus a Root and a deeply nested Node editor. The input caret and confirm/cancel controls remain visible above the keyboard, including on a device with a bottom safe area.
2. Toggle the keyboard, rotate, scroll browser chrome, and pinch zoom. The bar remains inside the visible viewport without Map layout positions changing.
3. Commit and cancel editing. Focus returns to the Node, the map has no unexpected pan, and the action bar returns to its normal location.
4. With VisualViewport unavailable (test by disabling the binding), the `interactive-widget=resizes-content`/`dvh` CSS path remains usable; with both unsupported, the bar is still reachable by normal page scroll rather than hidden by `overflow: hidden`.
5. Verify React Flow has a non-zero container size after every viewport change and that focused-node visibility adjustments do not loop or continually refit while browser chrome animates.

## Decision support

Adopt a **shell-owned, grid-reserved action bar; `interactive-widget=resizes-content`; safe-area padding; and a `VisualViewport` CSS-variable fallback**. Keep the VirtualKeyboard overlay API out of the baseline. This works with React Flow's sizing contract without making keyboard animation mutate the Map model or canvas viewport.

