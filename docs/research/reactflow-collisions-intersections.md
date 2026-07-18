# React Flow collisions and intersections in a layout-owned Map

**Ticket:** Research React Flow collisions and intersections examples  
**Scope:** Decide how React Flow's collision/intersection facilities apply when Mindi owns Map structure and Dagre owns every Node position.  
**Date:** 2026-07-18  
**Sources:** React Flow's official documentation and examples only.

## Finding

React Flow provides two different facilities which should not be conflated:

- The **Node Collisions** example is an opt-in *position-mutating repair algorithm* for a freely draggable graph. On every `onNodeDragStop`, it feeds the current React Flow node array into `resolveCollisions`, then replaces the array with the moved result. Its shown settings are unlimited iterations, a 0.5 overlap threshold, and 15px margin. [Node Collisions example](https://reactflow.dev/examples/layout/node-collisions)
- The **Intersections** example is a *query and presentation* pattern. While a node is dragged, it calls `getIntersectingNodes(node)`, converts the returned Nodes to IDs, and changes only the intersecting Nodes' CSS class to show feedback. It does not resolve the overlap. [Intersections example](https://reactflow.dev/examples/nodes/intersections)

The public instance API defines `getIntersectingNodes` as finding Nodes that intersect a supplied Node or rectangle. Its source specifies a default `partially` value of `true`, meaning any positive-area overlap qualifies; `false` instead requires one rectangle to contain the other. The optional third argument lets the caller provide the candidate Node array. Passing a Node excludes that Node itself. `isNodeIntersecting` is the corresponding boolean test against a rectangle. [ReactFlowInstance API](https://reactflow.dev/api-reference/types/react-flow-instance), [official `useReactFlow` source](https://github.com/xyflow/xyflow/blob/main/packages/react/src/hooks/useReactFlow.ts#L210-L235)

## How the official examples work

| Example | Trigger | Read | Write | Intended result |
| --- | --- | --- | --- | --- |
| Node Collisions | `onNodeDragStop` | Current controlled Node array | New Node positions from `resolveCollisions` | Repair collisions introduced by manual placement. |
| Intersections | `onNodeDrag` | `getIntersectingNodes(draggedNode)` | `className` only | Give a user live visual feedback about overlap. |

Both examples use React Flow's `useNodesState` and accept `onNodesChange`, so React Flow's drag interaction is allowed to update the Node positions. That is intentionally unlike Mindi: Mindi disables freeform node dragging and projects positions from the Map's layout adapter. [Node Collisions example](https://reactflow.dev/examples/layout/node-collisions), [Intersections example](https://reactflow.dev/examples/nodes/intersections)

## Recommendation for Mindi

**Do not use the Node Collisions algorithm in the normal add/restructure pipeline.** It would mutate the controlled React Flow projection after Dagre produced it, creating a second position owner and potentially breaking the tree's ranks, sibling order, and edge readability. The collision example is useful prior art for a free-placement editor, not the intended layout strategy for this Map.

Instead, make layout the single resolution step:

1. A Map command changes structure or measured content.
2. The layout adapter runs Dagre with the current Node dimensions and the chosen node/rank spacing.
3. The resulting positions become the entire controlled React Flow Node projection.
4. The canvas may verify the projection using `getIntersectingNodes` after React Flow has measured/rendered it. A non-empty result is a layout defect or stale-measurement signal—not a permission to nudge React Flow Nodes independently.

This composition gives a clear **“after add/restructure, no overlaps”** contract: Dagre layout is responsible for preventing overlaps; the React Flow API can be a development-time/integration-test assertion and diagnostics aid. It should query after a position/dimension update has reached the rendered flow, because the API queries the instance's current Nodes. The latter timing detail is an implementation inference from the API's instance-state role and its documented query signature. [ReactFlowInstance API](https://reactflow.dev/api-reference/types/react-flow-instance)

For a strict no-overlap assertion, test each projected Node against the rest with partial intersection enabled, excluding itself. A simple canonical policy is: every pair of rendered Node rectangles must have zero positive-area overlap. Touching edges can be defined separately if the visual design requires a gap; Dagre spacing, rather than the intersection helper, supplies that gap.

## Testing implications

- **Layout-unit seam:** Given Map structure, Root/sibling order, dimensions, and spacing, the layout adapter returns pairwise non-overlapping rectangles. This is the primary test and has no React Flow dependency.
- **Canvas integration seam:** Render the controlled projection, wait for initialization/measurement, then use `getIntersectingNodes` (or rectangle bounds) to assert that no two rendered Nodes intersect. This validates that adapter coordinates and React Flow's actual geometry agree.
- **Regression coverage:** Add cases for adding a child, adding a Root, moving/reparenting a subtree, and markdown/width changes. Each must trigger relayout and preserve the no-overlap property.

Do not copy the examples' drag callbacks or collision movement into Mindi. They are correct for the examples' interactive free-placement contract, but contradict the Map's layout-owned contract.

## Decision support

Choose **Dagre layout plus no-overlap verification**, not React Flow collision resolution. `getIntersectingNodes` remains useful as a renderer-level diagnostic and test oracle; it is not the layout engine. This keeps one source of truth for Node positions and makes any overlap after structural changes observable as a bug in measurement/layout configuration rather than an opportunity for local canvas repair.

## Primary sources

| Source | What it establishes |
| --- | --- |
| [React Flow: Node Collisions](https://reactflow.dev/examples/layout/node-collisions) | Collision resolver is called on drag stop and writes replacement Node positions. |
| [React Flow: Intersections](https://reactflow.dev/examples/nodes/intersections) | `useReactFlow().getIntersectingNodes` supports live intersection feedback. |
| [ReactFlowInstance API](https://reactflow.dev/api-reference/types/react-flow-instance) | Public signatures for `getIntersectingNodes` and `isNodeIntersecting`. |
| [Official `useReactFlow` source](https://github.com/xyflow/xyflow/blob/main/packages/react/src/hooks/useReactFlow.ts#L210-L235) | Default/containment semantics for `partially` and self-exclusion when passing a Node. |
