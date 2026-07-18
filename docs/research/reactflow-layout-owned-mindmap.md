# React Flow for a layout-owned mind Map

**Ticket:** [#4 — Research React Flow mind-map without freeform drag](https://github.com/setbap/mindi/issues/4)  
**Scope:** Confirm whether React Flow can render Mindi's layout-owned Map while preserving Mindi-owned navigation, focus, and text editing.  
**Sources:** Primary only — React Flow documentation and API reference.  
**Date:** 2026-07-17

## Product constraints

Mindi's **Map** is a non-empty forest whose **Node** positions are layout-owned. It has exactly one **Focused** Node, which is a domain/navigation state rather than text editing; the Viewport must keep a newly Focused Node visible without automatically centering it. See `CONTEXT.md` for the canonical vocabulary.

The canvas therefore needs to support panning and zooming, custom Node rendering, and programmatic viewport movement, while preventing React Flow's freeform graph-editor interactions from becoming an alternate source of truth.

## Findings

### React Flow can be the renderer, not the Map model

`<ReactFlow />` accepts controlled `nodes` and `edges`; its `onNodesChange` callback is explicitly for controlled-flow interactivity and receives drag, selection, and move changes. React Flow itself also supports an uncontrolled mode. For Mindi, prefer the controlled form: project the domain forest and the layout result into React Flow nodes/edges, and treat React Flow's positions as render data that Mindi replaces after every layout. [React Flow component reference](https://reactflow.dev/api-reference/react-flow)

This is compatible with the previously selected Dagre pipeline: calculate layout from the domain forest and measured node dimensions, then pass the resulting top-left positions to React Flow. Do not persist React Flow's freeform `position` as a Node attribute and do not use React Flow parent/subflow relationships to express the domain tree.

### Disable graph editing at the canvas boundary

The component exposes global interaction switches, and individual Node/Edge definitions can override several of them. A layout-owned baseline should set:

| Concern | Baseline | Why |
| --- | --- | --- |
| Dragging Nodes | `nodesDraggable={false}` | React Flow documents this as the global Node-drag switch; no user gesture can overwrite layout output. |
| Creating edges | `nodesConnectable={false}` | Parent/child relationships must go through Mindi's commands, not handles. |
| Reconnecting edges | `edgesReconnectable={false}` | Prevents mouse rewiring of the domain forest. |
| React Flow click-selection | `elementsSelectable={false}` | Prevents multi-select and its selection state from being mistaken for Mindi's single **Focused** Node. |
| Box selection | leave `selectionOnDrag={false}` | This is the documented default; do not enable a selection rectangle. |
| Node/edge Delete keys | `deleteKeyCode={null}` (and no app delete handler that delegates to RF) | Domain Delete (recursive), including its final-Node invariant, must be enforced above the canvas. |

These props are documented on the [React Flow component reference](https://reactflow.dev/api-reference/react-flow). `nodesDraggable` has an important pointer-event caveat: React Flow says mouse handlers on non-draggable Nodes need the `nopan` class, otherwise dragging within that Node can pan the viewport. Apply `nopan` to the custom Node shell or its interactive regions according to the desired pointer behavior.

The API also exposes `onNodesChange` for selection and move changes. With the editing features disabled, Mindi should not call the usual `applyNodeChanges` path for drag/selection updates; accepting those changes would reintroduce a second owner of positions and focus.

### Keep Focused separate from React Flow selection and keyboard a11y

React Flow's built-in keyboard behavior is graph-editor behavior: focusable Nodes can be cycled with Tab and selected with Enter, and its accessibility layer also supports arrow-key movement. Those meanings conflict with Mindi's Focused/Editing modes and domain navigation. Disable or intercept the conflicting built-ins (`nodesFocusable={false}`, `edgesFocusable={false}`, `disableKeyboardA11y`, `deleteKeyCode={null}`, and null any conflicting selection/pan/zoom activation key bindings), then implement the Mindi keymap at the application boundary. [React Flow component reference](https://reactflow.dev/api-reference/react-flow)

React Flow still provides ordinary click handlers and `onSelectionChange` if the UI needs them. The recommended model is: a click or domain keyboard command sets Mindi's Focused node ID; the React Flow Node projection uses that ID only for presentation (for example a focus ring). Do not derive Focused from React Flow's `selected` field, because React Flow supports multiple selection and selection may change independently of the domain's editing/navigation state. The distinction is an implementation inference from the documented independent selection controls and callbacks.

### Custom Nodes support markdown display and inline editing

React Flow maps a Node's `type` to a React component in `nodeTypes`. Its official custom-node guide demonstrates a text input inside such a component and registers the component outside the render function to avoid unnecessary re-renders. This supports one Mindi Node component that renders sanitized markdown in **Focused** mode and an editor with raw markdown in **Editing** mode. [Custom Nodes guide](https://reactflow.dev/learn/customization/custom-nodes)

Use the custom component's `data` only as a render projection and send edits to Mindi's application/domain state. For input/editor descendants, React Flow's official example adds `className="nodrag"`; use it for text controls. The documented utility-class guidance also provides `nowheel` when a Node control must consume wheel input rather than zoom the canvas. [Custom Nodes guide](https://reactflow.dev/learn/customization/custom-nodes), [Utility classes](https://reactflow.dev/learn/customization/utility-classes)

Content edits can change measured Node dimensions. React Flow provides `useNodesInitialized` and internal measured Node dimensions; wait until the visible Nodes are initialized before first layout, and request the same layout pipeline after a content/width change. [useNodesInitialized](https://reactflow.dev/api-reference/hooks/use-nodes-initialized), [Node type](https://reactflow.dev/api-reference/types/node)

### Pan and zoom are independently configurable

React Flow supports drag-to-pan via `panOnDrag`, scrolling pan via `panOnScroll`, and wheel/pinch/double-click zoom via `zoomOnScroll`, `zoomOnPinch`, and `zoomOnDoubleClick`; minimum and maximum zoom are also props. The official viewport guide shows configurations such as `panOnDrag={false}` with `panOnScroll` enabled. [Panning and Zooming](https://reactflow.dev/learn/concepts/the-viewport), [React Flow component reference](https://reactflow.dev/api-reference/react-flow)

Mindi can retain pan/zoom while preventing Node movement. Choose one explicit control scheme during the interaction decision (for example drag-to-pan plus wheel zoom); do not rely on undocumented defaults. Keep the Viewport uncontrolled unless persistence is specifically required. If it becomes controlled, the reference requires both `viewport` and `onViewportChange`; `defaultViewport` is ignored when initial `fitView` is enabled. [React Flow component reference](https://reactflow.dev/api-reference/react-flow)

For an initial all-Map framing, call `fitView` after mounting/layout. For explicit center-on-Focused behavior, use `setCenter(x, y, { duration? })`. React Flow also exposes `fitBounds`, `setViewport`, and coordinate conversion helpers. [ReactFlowInstance](https://reactflow.dev/api-reference/types/react-flow-instance)

Mindi's ordinary focus-follow requirement is narrower than `setCenter`: calculate whether the focused Node's rendered bounds fall outside the current viewport and pan only enough to reveal them. React Flow has `flowToScreenPosition`, `screenToFlowPosition`, `getViewport`, and `setViewport` to support that application-owned calculation. This is an implementation recommendation inferred from those official APIs; React Flow's `autoPanOnNodeFocus` is not sufficient as the product contract because it follows DOM focus rather than Mindi's domain Focused state.

## Recommended integration boundary

1. The domain store owns Map structure, Root/sibling order, markdown, width, color slot, Focused/Editing state, and all map commands.
2. A layout adapter turns that forest plus measured dimensions into a React Flow Node/Edge projection. Dagre remains the sole owner of positions.
3. A canvas adapter renders controlled React Flow elements with graph-editing features disabled, translates permitted pointer gestures into domain commands, and owns only ephemeral viewport behavior.
4. The custom Node component is a view/editor: it emits text and interaction intents; it does not mutate layout, parentage, or focus through React Flow's internal store.

This puts one seam above React Flow: tests can exercise domain commands and the resulting Node/Edge projection without coupling to React Flow's drag/selection internals. A small integration layer can separately verify the configured interaction props and viewport requests.

## Pitfalls to carry into the implementation spec

- **Do not accept position changes from `onNodesChange`.** That callback is called for drag/select/move, so blindly applying changes violates layout ownership. [React Flow component reference](https://reactflow.dev/api-reference/react-flow)
- **Do not model Focused as `selected`.** React Flow selection is optional and can be multi-element; Mindi needs exactly one domain Focused Node.
- **Do not let React Flow's keyboard defaults compete with the Mindi keymap.** Its tab/enter/arrow/delete behavior has different semantics.
- **Mark editor controls correctly.** `nodrag` protects inputs from node dragging; `nopan` is required for mouse handlers on non-draggable Nodes; `nowheel` prevents editor wheel gestures from manipulating the canvas. [Custom Nodes guide](https://reactflow.dev/learn/customization/custom-nodes), [React Flow component reference](https://reactflow.dev/api-reference/react-flow), [Utility classes](https://reactflow.dev/learn/customization/utility-classes)
- **Layout after measurement.** Initial or changed markdown dimensions must be measured before using them in the Dagre layout pass. [useNodesInitialized](https://reactflow.dev/api-reference/hooks/use-nodes-initialized)

## Decision support

React Flow is suitable as Mindi's canvas renderer. Its documented controlled mode, custom Node components, interaction switches, and viewport instance APIs support a strict separation: Mindi owns the Map and Focused state; the layout adapter owns positions; React Flow owns rendering, pointer delivery, and viewport mechanics. The implementing spec should explicitly disable freeform graph-editor interactions and treat React Flow selection/store state as non-authoritative.

## Primary sources

| Source | URL |
| --- | --- |
| React Flow component props and event handlers | https://reactflow.dev/api-reference/react-flow |
| ReactFlowInstance viewport helpers | https://reactflow.dev/api-reference/types/react-flow-instance |
| Custom Nodes guide | https://reactflow.dev/learn/customization/custom-nodes |
| React Flow utility classes | https://reactflow.dev/learn/customization/utility-classes |
| Panning and Zooming guide | https://reactflow.dev/learn/concepts/the-viewport |
| `useNodesInitialized` API | https://reactflow.dev/api-reference/hooks/use-nodes-initialized |
| Node type reference | https://reactflow.dev/api-reference/types/node |
