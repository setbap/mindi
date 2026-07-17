# Layout engines for L→R tree/forest mind maps

**Ticket:** [#5 — Research layout engines for L→R trees with dynamic width](https://github.com/setbap/mindi/issues/5)  
**Scope:** Choose a **single** layout engine for a strict tree/forest mind Map (Mindi).  
**Sources:** Primary only — engine docs/repos and React Flow layout integration docs.  
**Date:** 2026-07-17

## Product constraints (from ticket + domain)

| Constraint | Meaning for layout |
| --- | --- |
| Default growth **left → right** | Depth increases on X; siblings spread on Y |
| Node widths change (user resize) | Engine must accept **per-node** width/height and re-layout so children reattach cleanly |
| Multi-root **forest** in one Map | Several disconnected trees share one canvas; Detach creates a new Root |
| Positions are **layout-owned** | Engine output is source of truth for canvas coordinates |
| Pairing with **React Flow** | Feed measured dimensions; map engine coordinates onto RF nodes (top-left anchor) |
| Simplicity-first baseline | Prefer smallest config surface and integration cost that still meets the above |

Domain terms: **Map** (forest document), **Node**, **Root**, **Detach** — see `CONTEXT.md`.

---

## Candidates

1. **[@dagrejs/dagre](https://github.com/dagrejs/dagre)** — layered directed-graph layout (Sugiyama-style), client-side  
2. **[elkjs](https://github.com/kieler/elkjs)** — ELK (Eclipse Layout Kernel) for JS; flagship **layered** algorithm  
3. **[d3-hierarchy](https://github.com/d3/d3-hierarchy)** (brief) — tidy tree / related hierarchical layouts  

React Flow does **not** ship a layout engine; it documents third-party integration patterns.

---

## Comparison matrix (product axes)

| Axis | @dagrejs/dagre | elkjs | d3-hierarchy (`tree`) |
| --- | --- | --- | --- |
| L→R direction | `rankdir: "LR"` on the graph | `elk.direction: "RIGHT"` (enum: RIGHT / LEFT / DOWN / UP) | No native orientation; swap x↔y after layout (or treat depth as X) |
| Per-node size | **Yes** — each node requires `width` / `height` (px) | **Yes** — each child supplies `width` / `height` | **No** (for variable boxes) — `nodeSize([dx, dy])` is **uniform** for all nodes; RF rates “Dynamic node sizes: No” |
| Forest / multi-root | **Yes** — graph may have multiple sources / disconnected components in one `Graph` | **Yes** — disconnected components; `elk.separateConnectedComponents` | **Poor fit** — expects a **single** hierarchy root; multi-root needs a synthetic super-root + packing |
| Sync / API shape | Synchronous `dagre.layout(g)` | Async `elk.layout(graph)` → `Promise` | Synchronous `tree(root)` |
| Config surface | Small table (rankdir, nodesep, ranksep, edgesep, ranker, …) | Very large option set (ELK reference); RF: “good luck” on the Java-derived docs | Small (`size` / `nodeSize` / `separation`) |
| Edge routing | Positions only; edge control points optional; RF draws edges | Optional built-in routing (polyline, orthogonal, splines) | Positions only |
| Bundle (RF overview) | ~40 KB class | ~1.4 MB class | ~15 KB class |
| RF official stance | **Highly recommended for trees** — drop-in; free [Dagre Tree](https://reactflow.dev/examples/layout/dagre) example | Power option; free [Elkjs Tree](https://reactflow.dev/examples/layout/elkjs) example; RF warns complexity / support cost | Fine for single-root uniform trees; listed with caveats |

Sources for the RF comparison table and recommendations: [React Flow — Layouting overview](https://reactflow.dev/learn/layouting/layouting).

---

## 1. @dagrejs/dagre

### What it is

Client-side layout for **directed graphs**. Design priorities (wiki): completely client-side, **speed** over exact optimality, **rendering-agnostic** (only needs node dimensions).

- Package: `@dagrejs/dagre` (org package receives updates; legacy unscoped `dagre` is not the active line)  
- Docs: [dagre wiki](https://github.com/dagrejs/dagre/wiki)  
- Repo: [github.com/dagrejs/dagre](https://github.com/dagrejs/dagre)

### L→R

Graph attribute **`rankdir`**: `TB` (default), `BT`, **`LR`**, `RL`.

```js
g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 50 });
```

### Dynamic node size

Nodes must carry pixel **`width`** and **`height`**. Layout writes center coordinates:

- Output: `node.x`, `node.y` = **center** of the node  
- Spacing: `nodesep`, `ranksep`, `edgesep`, margins  

Re-layout after resize: rebuild (or reset) the graph with updated widths, call `dagre.layout` again. Children re-rank/reattach from the same edge list.

### Forest

A single `dagre.graphlib.Graph` can hold multiple disconnected components (wiki example has several roots that later join; pure forests with no shared descendants also layout as separate components). Suitable for Map = multi-Root forest without a fake super-root.

### React Flow pairing

Official free example: [Dagre Tree](https://reactflow.dev/examples/layout/dagre).

Integration pattern (from RF docs/example):

1. `setGraph({ rankdir: direction })` with `direction === "LR"` for horizontal growth.  
2. For each RF node, `setNode(id, { width, height })` — use measured sizes when available.  
3. For each parent→child edge, `setEdge(source, target)`.  
4. `dagre.layout(g)`.  
5. Map center coords to RF **top-left** anchor:

   ```js
   position: {
     x: nodeWithPosition.x - width / 2,
     y: nodeWithPosition.y - height / 2,
   }
   ```

6. Set `sourcePosition: "right"`, `targetPosition: "left"` when horizontal.

RF notes the free example is **static** (layout once); dynamic re-layout on node/edge/size change is supported by the same `getLayoutedElements` pattern (Pro auto-layout example demonstrates engines side by side). Measured dimensions: RF measures nodes; `useNodesInitialized` / store-driven re-run after sizes exist is the documented approach for avoiding layout-before-measure flash.

### Fit for Mindi

| Need | Fit |
| --- | --- |
| L→R default | Direct (`rankdir: "LR"`) |
| Resize → reattach | Per-node width/height + re-layout |
| Multi-root Map | Natural multi-component graph |
| RF | Official example + small API |
| Simplicity | Smallest viable full-fit option |

**Caveats:** not a pure “tidy tree” aesthetic (layered DAG heuristics); edge routing is RF’s job; full re-layout on every change (acceptable at mind-map scale). Sub-flow edge cases exist but Mindi does not use nested RF parent nodes as subflows for structure.

---

## 2. elkjs

### What it is

JS port of **Eclipse Layout Kernel**. Not a renderer — computes positions (and optionally edge routes). Flagship: **layered** (Sugiyama-family) with many phase options. Default algorithms include `layered`, `stress`, `mrtree`, `radial`, `force`, `disco`.

- Package: `elkjs`  
- Docs: [ELK reference](https://eclipse.dev/elk/reference.html), [elkjs README](https://github.com/kieler/elkjs)  
- JSON graph: root with `children[]`, `edges[]`, per-element `layoutOptions`

### L→R

```js
layoutOptions: {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT", // overall edge direction
}
```

(`org.eclipse.elk.direction`: UNDEFINED | RIGHT | LEFT | DOWN | UP.)

### Dynamic node size

Each child node includes **`width`** and **`height`**. RF Elkjs example hardcodes 150×50; product code should pass measured values the same way as dagre.

### Forest

Pass all Nodes as children of one root graph; disconnected components can be separated via **`elk.separateConnectedComponents`**. Component packing/spacing options exist (`elk.spacing.componentComponent`, layered connected-component compaction). Fits multi-root Maps, with more knobs than dagre.

### React Flow pairing

Official free example: [Elkjs Tree](https://reactflow.dev/examples/layout/elkjs).

- Async: `elk.layout(graph).then(...)`  
- Map `node.x` / `node.y` → `position: { x, y }` (ELK uses top-left-style coordinates in the JSON pipeline RF shows — still verify against measured width when centering handles).  
- Horizontal: `elk.direction: "RIGHT"` + left/right handle positions.  
- Optional edge routing options if RF default edges are insufficient.

RF layout overview: elkjs is the **most configurable and most complicated**; they “don’t often recommend” it because of support cost; keep the ELK Java option reference open.

### Fit for Mindi

| Need | Fit |
| --- | --- |
| L→R / sizes / forest | Yes |
| RF | Official example |
| Simplicity | **Poor** — large option space, async worker setup, ~1.4 MB class |

**When it becomes attractive later:** ports, orthogonal edge routing, compound/nested graphs, or layout quality that dagre cannot reach after real Maps stress the baseline.

---

## 3. d3-hierarchy (brief)

### What it is

Hierarchical visualizations: tidy **tree**, cluster, treemap, partition, pack. Relevant API: `d3.tree()` — Reingold–Tilford tidy layout (Buchheim et al. linear-time improvement).

- Docs: [d3-hierarchy](https://d3js.org/d3-hierarchy), [tree](https://d3js.org/d3-hierarchy/tree)  
- Repo: [github.com/d3/d3-hierarchy](https://github.com/d3/d3-hierarchy)

### L→R

Layout assigns abstract `node.x` / `node.y` (breadth vs depth). For left-to-right mind maps, treat depth as X and breadth as Y (swap after layout). No first-class `rankdir`.

### Dynamic node size

`tree.nodeSize([dx, dy])` applies **one** size to every node for spacing. Official RF layout overview marks **Dynamic node sizes: No**. Per-node user resize (variable width boxes with children that must reattach without overlap) is **not** what stock `d3.tree` models. RF points to **d3-flextree** / **entitree-flex** if variable dimensions are required on a tidy-tree algorithm — out of ticket scope as the three named candidates.

### Forest

`d3.hierarchy` / stratify assume a **single** root. Multi-root Maps require a synthetic parent Root, then manual packing of components — extra product code, not free.

### React Flow pairing

Documented in the layout overview; Pro auto-layout can switch engines including d3-hierarchy. Smallest bundle of the three, but wrong shape for Mindi’s forest + resize constraints.

### Fit for Mindi

Only if Maps were single-root and all Nodes shared one fixed size. **Does not meet** dynamic width or multi-root without substantial glue or a different library.

---

## React Flow integration notes (all engines)

From [Layouting overview](https://reactflow.dev/learn/layouting/layouting) and free examples:

1. RF **does not** layout nodes; you run an external engine and write `position`.  
2. Engines that support variable size need **measured** width/height (RF measurement / `node.measured` / wait until initialized).  
3. Dagre positions are **center-based** — convert to RF top-left.  
4. L→R: set source handles **right**, target handles **left**.  
5. Re-run layout when structure or dimensions change (static free examples do not; product baseline should).  
6. Edges: dagre/d3 leave routing to RF; elkjs can supply routes if desired later.

---

## Recommendation

### Baseline choice: **`@dagrejs/dagre`**

For a simplicity-first, single-engine mind Map with:

- default **L→R** (`rankdir: "LR"`),  
- **per-Node width** (and height) from measurement / user resize,  
- **multi-Root forests** in one graph,  
- **React Flow** as canvas,

**@dagrejs/dagre** is the only candidate that hits all product axes with a small API, sync layout, official RF tree example, and modest bundle. RF’s own guidance: if you need a tree, *highly recommend dagre*.

### Not baseline

| Engine | Reason |
| --- | --- |
| **elkjs** | Capable of everything Mindi needs, but complexity and size fight simplicity-first; reserve as upgrade path if layered quality, edge routing, or ports become requirements |
| **d3-hierarchy** | Strict single-root + uniform node size; fails dynamic width and forest without extra algorithms/libraries |

### Suggested integration sketch (not implementation)

1. Domain forest → flat RF nodes + parent→child edges.  
2. After measure (or known width from domain), build dagre graph with `rankdir: "LR"`.  
3. Layout → convert centers to top-left → set RF positions.  
4. On resize / create / Detach / restructure: re-run the same pipeline.  
5. Keep edge type simple (e.g. smoothstep/bezier); revisit elkjs only if routing quality blocks polish.

### Non-goals of this research

- App implementation  
- Custom tidy-tree with flextree  
- Editing map #1 (wayfinder map body)

---

## Primary sources

| Source | URL |
| --- | --- |
| dagre wiki (config, rankdir, width/height, output) | https://github.com/dagrejs/dagre/wiki |
| @dagrejs/dagre README | https://github.com/dagrejs/dagre |
| elkjs README (API, layered example, workers) | https://github.com/kieler/elkjs |
| ELK direction option | https://eclipse.dev/elk/reference/options/org-eclipse-elk-direction.html |
| ELK separate connected components | https://eclipse.dev/elk/reference/options/org-eclipse-elk-separateConnectedComponents.html |
| ELK layered algorithm | https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html |
| d3-hierarchy | https://d3js.org/d3-hierarchy |
| d3.tree | https://d3js.org/d3-hierarchy/tree |
| React Flow layouting overview | https://reactflow.dev/learn/layouting/layouting |
| React Flow Dagre Tree example | https://reactflow.dev/examples/layout/dagre |
| React Flow Elkjs Tree example | https://reactflow.dev/examples/layout/elkjs |

---

## Decision one-liner

**Use `@dagrejs/dagre` with `rankdir: "LR"` and measured per-Node dimensions as Mindi’s single baseline layout engine; defer elkjs; do not use stock d3-hierarchy for variable-width multi-root Maps.**
