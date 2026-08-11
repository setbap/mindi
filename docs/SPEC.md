# Mindi implementation specification

## Status and authority

This is the authoritative handoff for implementing Mindi, an offline mind-map web application. It supersedes the planning conversation. Terms capitalized here use the canonical definitions in [CONTEXT.md](../CONTEXT.md). ADRs and research notes are supporting evidence; where they differ in detail, this specification wins.

Build the specified product; do not reopen product decisions or add cloud services, accounts, collaboration, or native wrappers.

## Product outcome

Mindi is a local-only, installable web app for editing ordered, multi-root Maps of Markdown Nodes on a left-to-right canvas. It works offline after a successful online installation, persists locally, exports losslessly to Mindi JSON, and has an accessible Node-browser alternative to the canvas.

## Non-negotiable invariants

- A Map is a non-empty ordered forest. A new Map starts with exactly one empty Root, and imports with no Nodes are invalid.
- The Map catalog always has at least one Map. Its final Map cannot be deleted; a Map's final Node cannot be deleted.
- Every Map has exactly one Focused Node. Focused and Editing are distinct states.
- Node position is layout-owned. Dagre is the sole position writer; React Flow must never repair overlaps by moving Nodes independently.
- Root and sibling order are persisted domain data, not inferred from canvas coordinates.
- Mindi has no hard Node limit. At 512 Nodes it warns that performance may slow.
- Core Map CRUD never depends on a network request.

## Domain model and persistence

### Records

Persist data in IndexedDB behind an application-owned, typed `MapRepository` using `idb` ([ADR 0001](adr/0001-local-map-persistence.md)). React components do not access IndexedDB directly.

- **Catalog/settings record:** Map metadata, persisted Open Map ID, global nine-slot Palette, persisted Language preference, and schema version.
- **Map record:** Map ID, name, ordered `rootIds`, and a keyed Node collection/snapshot. Store each Map as a transactional complete ordered-forest record.
- **Node record:** stable ID, raw Markdown, width, color-slot number 1–9, `parentId` or null, and ordered child IDs. Height and canvas position are not persisted.

Use versioned migrations at the repository boundary. Persist completed Map commands atomically before regarding them as complete. If the remembered Open Map no longer exists, open the first catalog Map.

The Palette is one global persisted set of nine editable hex values. Nodes store slot references only; palette changes are live across every Map.

### Map manager

Provide a responsive Map manager that lists Maps and offers Create, Rename, Delete, Switch, Import, and Export. It identifies the Open Map.

- Desktop (`>=768px`): Dialog and optionally collapsible docked Node-browser sidebar.
- Mobile (`<768px`): Vaul bottom Drawer. Use the same responsive overlay abstraction for every Dialog/Drawer pair.
- First launch and Create make **Untitled Map** with one blank, Focused Root and a typing invitation.
- Rename is inline: Enter or blur commits; Escape cancels.
- Deleting the open Map switches to the next Map, otherwise the previous Map. The final Map's Delete action is disabled with an explanation.

## Map commands and state

### Focused and Editing

The canvas and Node browser always share the Map's Focused ID. Click/tap focuses a Node; a second click/tap on its text enters Editing. Focus has a persistent high-contrast ring.

| State/action | Required behavior |
| --- | --- |
| Arrow navigation | Navigate the ordered forest according to the defined keyboard model; keep the resulting Focused Node visible by panning only as much as required, never auto-centering. |
| Enter while Focused | Create an empty sibling immediately below the current Node and keep Focused (do not enter Editing). |
| Tab while Focused | Create an empty last child and keep Focused so Tab can chain rapidly. |
| Space while Focused | Enter Editing with the current markdown draft. |
| Typing while Focused | Enter Editing with that typed input. |
| Enter while Editing | Commit raw Markdown and return to Focused. |
| Escape while Editing | Commit raw Markdown and return to Focused (drafts are not discarded). |
| Blur / focus another Node while Editing | Commit raw Markdown, then apply the focus change. |
| Tab while Editing | Insert indentation. |

### Structure and order

- **Create Root:** append an empty Root and focus it.
- **Move up/down:** move the Focused Node exactly one place in sibling order, or Root order for a Root. Disable at the relevant boundary. Bind Alt/Option+Up and Alt/Option+Down.
- **Move under:** show an eligible target picker that excludes the Node and all descendants. Make the Node the target's last child; it remains Focused. Moving a Root may merge trees.
- **Swap with parent:** unavailable for a Root. The Focused Node takes the parent's place in the grandparent's child order or Root order; the old parent becomes its last child. Arbitrary ancestor/descendant swaps are deferred.
- **Detach:** unavailable for a Root. Remove the Node/subtree from its parent and append it to Root order; retain focus.
- **Delete (recursive):** leaf deletion is immediate; a subtree requires confirmation with descendant count. Delete the Root too when other Nodes remain. After deletion focus next sibling/Root, else previous sibling/Root, else parent. Disable final-Node deletion with an explanation.

### Resize, color, undo

- Node width is persisted, default 280px, bounded 180–480px. Height follows content.
- Desktop exposes a right-edge resize handle. Mobile and keyboard users get an accessible numeric Resize command. Preview during drag; on release/confirmation commit once, then relayout once. Provide Reset width.
- Color applies a Palette slot, not an ad-hoc hex value.
- Undo/Redo is per Map, in memory only, and holds the latest 100 completed Node/forest commands: committed text, color, resize, and structural commands. It excludes Map catalog actions, Import, and global Palette changes. New commands clear Redo; history clears on Map close/reload. Bind Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z and disable unavailable actions.

## Canvas, layout, and connectors

Render a controlled React Flow projection only. The domain store owns structure, content, width, color, Focused/Editing state; the layout adapter owns positions; React Flow owns rendering and transient viewport mechanics.

### Required React Flow boundary

- Disable node dragging, connection creation/reconnection, React Flow selection, box selection, Node/edge focus, graph-editor keyboard behavior, and delete handling.
- Never apply React Flow move/selection changes to domain state. Do not store React Flow positions or use parent/subflow relationships as the domain tree.
- Custom Nodes render safe Markdown in Focused mode and a native labelled raw-Markdown editor in Editing mode. Apply `nodrag`, `nopan`, and `nowheel` safeguards where appropriate.
- The Viewport is transient and is neither persisted nor exported.

### Dagre pipeline

Use `@dagrejs/dagre` as the sole v1 left-to-right forest layout engine ([ADR 0002](adr/0002-dagre-for-map-layout.md)). Use 64px rank spacing and 32px sibling/component spacing.

1. After load, measure Nodes, run one layout, then fit the Map once.
2. After a structural or committed size change: mutate domain and persist; measure; run Dagre; replace the controlled React Flow positions; verify no positive-area Node overlap; then run only the visibility pan needed for Focused.
3. A focused Node may move because layout changes; it is never pinned.
4. Above 512 Nodes, show a non-blocking **Laying out** status, disable layout animation, and coalesce pending work to the latest layout request.

Treat any positive-area overlap as a defect. `getIntersectingNodes` may diagnose or test the projection after render but must never be used to nudge individual Nodes ([research](research/reactflow-collisions-intersections.md)).

### Connectors and viewport

Every parent-child relation renders as a thin, rounded orthogonal Connector from the parent's right side to the child's left side. It is display-only: no handles, labels, selection, hover effect, reconnection, or direct edge action. Normal color is the muted semantic border; direct parent/child Connectors of the Focused Node use the semantic focus color. Keep Connectors visible at every zoom level.

Allow pan and zoom using an explicitly configured React Flow control scheme. The canvas must not treat panning or zooming as a Map change. On keyboard focus changes, pan only enough to reveal the Node.

### Performance targets

At the 512-Node warning threshold, target layout within 250ms on desktop and 750ms on a midrange mobile device; target initial load/layout within 1s desktop and 2s midrange mobile. Provide a deterministic 512-Node fixture and Playwright benchmark/acceptance coverage.

## Node browser, search, and accessibility

### Node browser search

The Node browser displays the same Root and sibling order as the canvas; it is the semantic tree alternative and does not draw Connectors.

- Empty query: show the complete ordered forest, expanded enough to reveal Focused; no recent/all-nodes mode.
- Query: case-insensitive search over plain-text Markdown. Prefix matches rank before other substring matches; ties use forest traversal order.
- Results: show a filtered tree containing each matching Node and its ancestor path. Highlight matching plain-text terms only.
- Up/Down moves visible results. Enter focuses and reveals the result on the canvas.
- No result: show **No matching nodes**. Escape clears search and restores the full forest. No fuzzy suggestions or create-from-search in v1.

### Canvas accessibility

Follow [ADR 0005](adr/0005-accessible-map-canvas.md).

- Expose one labelled, tabbable Map-canvas focus host with `aria-activedescendant` identifying Focused. Do not use React Flow's graph-editor keyboard model.
- Give every Node an accessible name derived from plain-text Markdown plus concise structural context. Editing uses a normal labelled text control.
- Escape must return from the canvas to the prior entry control or Node-browser toggle. No keyboard trap.
- Provide keyboard equivalents for every pointer affordance, including resize. Interactive targets are at least 24×24 CSS px or have an equivalent larger semantic control.
- Use a polite live region for structural/mode results only; do not announce every focus repeat, layout, or autosave. Focus ring/meaningful graphical states meet 3:1 non-text contrast and are not obscured by chrome.
- Respect `prefers-reduced-motion`: remove decorative layout, viewport, and overlay animation. Essential visibility movement may remain.

### Mobile shell

The mobile action bar is a shell-owned DOM sibling of React Flow, not a viewport child. It overlays the full-bleed canvas (absolute bottom chrome) and must not reserve a layout row that shrinks the Map stage. Use `interactive-widget=resizes-content`, safe-area padding, and a `VisualViewport` CSS-variable fallback. Do not baseline the experimental VirtualKeyboard overlay API. When viewport geometry changes, do not move Nodes; after resize settles, check Focused visibility at most once. See [mobile research](research/mobile-keyboard-aware-bottom-bar.md).

On mobile (`<768px`), the shell is a full-bleed canvas with overlay chrome: top undo / editable Map title / redo; bottom Structure+App and Style entry points, create-child, focused-Node pill (opens the Node browser Vaul drawer), and create-sibling. Structure, Style, and Node browser live in Vaul drawers (one open at a time). App controls (Map manager, language, theme) live in the Structure+App drawer.

## Markdown and clipboard

Render CommonMark plus GFM using `react-markdown` and `remark-gfm` ([ADR 0004](adr/0004-safe-markdown-rendering.md)).

- Raw HTML is rendered as text, never active HTML.
- Permit links only for `https:`, `http:`, and `mailto:`. Open external links with `noopener noreferrer`.
- GFM task lists are display-only.
- Images may load normally. Offline/failed images render only an alt-text button/link to the image source.
- Node raw Markdown is authoritative. In any text rendering used for names/search, derive plain text safely.

Clipboard applies only in Editing: Cmd/Ctrl+C, X, and V are native system text operations on the raw Markdown selection. Paste accepts `text/plain`, converts CRLF/CR to LF, and otherwise preserves text/whitespace verbatim. Ignore rich-text and HTML formats. Focused mode has no Node/subtree clipboard. Paste never creates Nodes, imports files, or fetches/embeds images; URLs remain Markdown text.

## Import and export

### Native format

Use `.mindi.json` with media type `application/vnd.mindi+json`. The versioned envelope includes `formatVersion`, one or more Maps, each Map's ordered Roots and Nodes (ID, raw Markdown, width, color slot, ordered structure), and a Palette snapshot. It excludes viewport, Focused, and Editing state.

Normal Export contains the Open Map. **Export all Maps** creates a multi-Map backup.

### Import

Import is additive. Validate the envelope, display valid Maps for review/selection (all selected by default), and never auto-switch the Open Map.

- Remap every imported Map and Node ID.
- If a name collides, append `(imported)`.
- Reject an invalid individual Map while importing other valid Maps.
- Reject an invalid envelope or a selection with no valid Maps.
- Do not silently replace data. External formats/adapters are out of v1 unless separately specified.

## PWA and offline behavior

Use Vite PWA / Workbox `generateSW` with an explicit manifest, `registerType: 'prompt'`, same-origin startup assets, generated precache, and `navigateFallback: '/index.html'`. Use explicit `virtual:pwa-register` callbacks; no core runtime cache or navigation preload baseline. See [offline research](research/offline-pwa-after-install.md).

- Show **Install Mindi** only when the browser signals installability, with a short install description. Dismissal hides it until the next eligible session. Never show an unavailable/broken control.
- After `onOfflineReady`, show one non-blocking **Mindi is ready to work offline** notice. Installation/first load alone is not proof.
- On `onNeedRefresh`, show persistent **Update ready** with **Reload update** and **Later**. Never auto-reload.
- If a Node is Editing when reload is requested, require **Finish editing** or **Discard draft and reload**.
- Unsupported/failed PWA setup stays quiet: Mindi remains a normal online local app but makes no offline claim.

Production release testing must install online, close, launch offline, exercise CRUD/restructure/export/reopen/deep-link, and test both update choices.

## Visual system and language

Use React, Vite, strict TypeScript, Tailwind CSS, and selectively installed shadcn/ui ([ADR 0003](adr/0003-tailwind-and-shadcn-ui.md)). Use dark semantic CSS tokens for surfaces, text, borders, depth, destructive actions, and focus rings. Users can choose among built-in dark themes (persisted locally); theme changes update shell chrome including Safari toolbar tint. Palette remains separate from Theme. Use shadcn Sonner for non-blocking notices. Use **Vaul** for mobile bottom drawers; do not add MUI. Desktop overlays remain Dialog-based.

Language is a persisted application setting: English by default and Persian when chosen by the user. Translate all shipped visible UI, dialogs, notices, and accessibility labels. Persian uses RTL chrome and moves the sidebar to the right, but **never reverses the Map**: layout, Root/sibling order, traversal, shortcuts, and Connector direction remain left-to-right. Node text uses `dir="auto"`. JSON fields, technical errors, keyboard shortcuts, and Map structure are locale-neutral; missing translations fall back to English.

## Tooling and verification

- Package manager: pnpm through Corepack; pin one Node LTS release in the repository.
- Quality: ESLint with TypeScript/React rules, Prettier, `prettier-plugin-tailwindcss`, and scripts for `lint`, `format:check`, and `test`.
- Tests: Vitest + React Testing Library; `fake-indexeddb` for `MapRepository`; Playwright for browser flows.

### Minimum acceptance suite

1. Repository/domain tests cover all non-empty forest invariants, ID/order persistence, migrations, import validation/remapping, undo boundaries, delete fallback focus, and all structure commands.
2. Layout tests cover multi-Root forests, dynamic widths, add/reparent/detach/resize/content changes, and assert zero positive-area overlap. A canvas integration test verifies the rendered projection as well.
3. Keyboard/a11y tests cover Focused/Editing transitions, canvas entry/exit, active descendant, Node browser parity/search, visible focus, live feedback, pointer-equivalent commands, and reduced motion.
4. Responsive tests cover desktop Dialog/mobile Vaul Drawer, Persian sidebar direction without canvas reversal, and a real/emulated iOS and Android keyboard scenario where editor and essential actions remain visible.
5. Markdown tests cover raw HTML, URL filtering, task display, image failure fallback, and plain-text clipboard normalization.
6. PWA tests run against a production build: successful install online, later offline launch and CRUD, offline deep-link, precache coverage, and prompt update with active-edit safeguards.
7. Performance tests use the 512-Node fixture and enforce the stated desktop/mobile load/layout budgets without a hard Node limit.

## Implementer discretion

The implementing agent may choose file/module boundaries, state-management library, exact iconography, exact Gruvbox token values, and the precise arrow-navigation algorithm only where it preserves every invariant and acceptance outcome above. Any choice that changes product behavior, persistence schema meaning, Map direction, or accessibility semantics requires a new decision rather than silent invention.

## Supporting records

- [Glossary](../CONTEXT.md)
- [Architecture decisions](adr/)
- [Research artifacts](research/)
