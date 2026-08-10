# Mindi

Offline mind-map web app: local-only documents of hierarchical notes on a canvas.

## Language

**Map**:
A single mind-map document the user can open, rename, export, or delete. One Map is open at a time. A Map is a **forest** — one or more independent Root trees, not a single-root tree. A new Map begins with one empty Root; an imported Map with no Nodes is invalid. Map catalog always contains at least one Map. A Map has no hard Node limit, but warns at 512 Nodes that performance may slow.
_Avoid_: Document (except in UI copy like “file”), Workspace, Project

**Map catalog**:
The persisted application-level collection of Maps and their lightweight metadata, separate from each Map's Node forest.
_Avoid_: Workspace, Project list

**Map manager**:
The responsive Dialog/Sheet used to list Maps and create, rename, delete, switch, import, or export them. It identifies the Open Map.
_Avoid_: Workspace manager

**Open Map**:
The one Map currently shown and receiving commands. Mindi remembers its ID across launches; if it no longer exists, it opens the first Map in Map catalog.
_Avoid_: Selected Map

**Map canvas**:
The labelled, keyboard-operable visual region that renders the Open Map. It has one focus host and exposes the Focused Node as its active descendant; the Node browser is the semantic tree alternative.
_Avoid_: Freeform graph editor

**Export**:
Create a lossless, versioned Mindi JSON file. Normal Export contains the current Map; Export all Maps creates a multi-Map backup. It includes a Palette snapshot but excludes transient Viewport and Focused/Editing state.
_Avoid_: Share, Sync

**Import**:
Validate a Mindi JSON file, let the user select valid Maps to add to the Map catalog, and create fresh Map and Node IDs for them. It never replaces existing Maps or switches the open Map automatically.
_Avoid_: Restore (unless a future recovery feature is defined)

**Node**:
One item in a Map’s forest. Holds markdown text, a width, a color **slot** reference (1–9), and tree links (parent/children). May be empty. Its persisted width is 180–480 px (280 px by default); height is content-driven. Positions on the canvas are **layout-owned**, not freeform user coordinates.
_Avoid_: Card, Bubble, Topic, Item (except generic UI)

**Markdown**:
The raw text content of a Node. Mindi supports CommonMark with GFM extensions; raw HTML remains text rather than active rendered content.
_Avoid_: Rich text, HTML content

**Clipboard**:
The system text clipboard available only while a Node is Editing. Copy, cut, and paste operate on the editor's raw Markdown selection; paste accepts `text/plain`, normalizes line endings to LF, and otherwise preserves its text verbatim. It never copies or creates Node structure.
_Avoid_: Node clipboard, Structural paste, Rich-text paste

**Resize**:
Change a Node's width using its right-edge handle or the accessible Resize command. The new width is committed on release or confirmation, then Layout recomputes geometry without changing the Node's parent or Sibling order.
_Avoid_: Scale, Vertical resize

**Node browser**:
The sidebar view of the current Map's forest. It reflects the same Root and Sibling order as the canvas and shares its Focused Node. An empty search shows the complete forest and reveals the Focused Node. A query searches case-insensitive plain-text Markdown, ranks prefix then substring matches by forest traversal order, and shows matching Nodes with their ancestor paths; selecting a result focuses and reveals it on the canvas.
_Avoid_: Outline (unless referring generically to another format)

**Layout**:
The Dagre computation that turns a Map's ordered forest and measured Node dimensions into canvas positions. It runs after a structural or committed size-changing Map command and after load; React Flow renders its result but never changes positions to repair spacing or overlaps.
_Avoid_: Manual placement, Drag layout

**Connector**:
The non-interactive parent–child line on the Map canvas. Connectors are thin, rounded orthogonal lines that leave a parent on the right and enter its child on the left. They remain visible at every zoom level; the Focused Node's immediate relationships use the focus color.
_Avoid_: Edge interaction, Handle, Connection control

**Root**:
A Node with no parent. A Map may have many Roots after create-root or Detach.
_Avoid_: Top-level node (prefer Root)

**Root order**:
The persisted, intentional sequence of a Map's Roots. It determines their traversal and layout order.
_Avoid_: Root position (positions are layout-owned)

**Create Root**:
The action that appends a new empty Root to the current Map's Root order and makes it Focused.
_Avoid_: Create top-level node

**Sibling order**:
The persisted, intentional sequence of a Node's child Nodes. It determines their traversal and layout order.
_Avoid_: Child position (positions are layout-owned)

**Move up / Move down**:
Focused-mode commands that move the Focused Node one place within its Sibling order, or within Root order when it is a Root. They are unavailable at the respective order boundary.
_Avoid_: Move visually up/down (the commands change order, not canvas coordinates)

**Move under**:
A Focused-mode command that moves the Focused Node and its subtree to become an eligible target Node's last child. The target picker excludes the Focused Node and its descendants. It may move a Root under another tree, and the moved Node remains Focused.
_Avoid_: Drag to reparent, Move into

**Swap with parent**:
A Focused-mode command that reverses the relationship between the Focused Node and its parent. The Focused Node takes the parent's position in its grandparent's Sibling order or Root order; the former parent becomes its last child. It is unavailable for a Root.
_Avoid_: Swap with chosen ancestor, Swap with chosen descendant

**Color slot**:
One of nine fixed palette entries. Nodes store a slot number; hex values live only in the palette and are looked up live.
_Avoid_: Color, Tag color, Custom color, Hex on the node

**Focused**:
A Node is selected for navigation/commands but not text-editing. Every Map has exactly one Focused Node. Desktop arrows navigate; Enter creates a sibling immediately below; Tab creates a child; typing or Space enters **Editing**. A click/tap focuses a Node; a second click/tap on its text enters Editing. Focus is shown by a persistent high-contrast ring on the Focused Node (not the whole canvas pane).
_Avoid_: Selected (when you mean the focused-not-editing state specifically)

**Editing**:
A Node has an active text cursor; raw markdown is shown. Enter, Escape, and click/focus away all commit the draft and return to **Focused**. Tab inserts indentation. Drafts are not discarded.
_Avoid_: Active, Input mode

**Viewport**:
The visible pan-and-zoom region of a Map's canvas. When keyboard navigation changes the Focused Node, the Viewport pans only as much as needed to keep that Node visible; it does not automatically center it.
_Avoid_: Node position, Canvas state

**Undo / Redo**:
The in-memory, per-Map history of the latest 100 completed Node and forest commands. It includes committed text edits, Color-slot changes, Resize, and structural commands; it excludes Map catalog actions, Import, and the global Palette. History clears when the Map closes or Mindi reloads, and a new command after Undo clears Redo.
_Avoid_: Recovery, Version history

**Detach**:
Remove a non-Root Node from its parent only; that Node and its subtree become a new Root appended to Root order in the same Map, and it remains Focused. It is unavailable for a Root.
_Avoid_: Orphan, Unlink, Extract (unless UI label)

**Delete (recursive)**:
Permanently remove a Node and all descendants, including a Root when another Node remains in the Map. A Map's final Node cannot be deleted, so the command is disabled there. Deleting a subtree with descendants requires confirmation; deleting a leaf does not. Focus then moves to the next sibling or Root, otherwise the previous one, otherwise the deleted Node's parent.
_Avoid_: Cut (unless clipboard is specified later)

**Palette**:
The one persisted, global set of nine editable Color slots and their hex values, looked up live by Nodes in every Map.
_Avoid_: Theme (theme includes surfaces/chrome; Palette is the nine accents)

**Theme**:
The non-Node visual system: Gruvbox-dark semantic tokens for app surfaces, text, borders, depth, destructive actions, and focus rings. It is distinct from the Palette, which supplies the nine Node accents.
_Avoid_: Palette, Node color

**Language**:
The persisted application-chrome preference: English by default or user-selected Persian. Persian translates all shipped UI and accessibility text and places the sidebar on the right. It never reverses the Map canvas: layout, Connector direction, traversal, and shortcuts stay left-to-right. Node text uses bidirectional automatic direction.
_Avoid_: Map direction, Content language detection

**Offline-ready**:
The point at which Mindi's installed PWA shell has finished preparing and can start without a network connection. Mindi confirms this once with a non-blocking notice; installation alone is not an offline guarantee.
_Avoid_: Installed, cached (unless referring to the technical cache)

**Update ready**:
A newer installed PWA version is available but not yet active. Mindi keeps the current version running until the user explicitly chooses to reload; it protects an active Editing draft before that reload.
_Avoid_: Auto-update, forced refresh
