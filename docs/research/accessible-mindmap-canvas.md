# Accessible keyboard mind-map canvas patterns

**Ticket:** Research accessible keyboard mind-map canvas patterns  
**Scope:** Evidence and implementation options for a keyboard-operated, screen-reader-accessible, layout-owned Mindi Map canvas. This note does not choose Mindi's final interaction or ARIA policy.  
**Sources:** Primary/first-party documentation only — W3C WAI-ARIA APG and WCAG, React Flow documentation, and MDN platform documentation.  
**Date:** 2026-07-19

## Existing constraints

Mindi's Map is a non-empty ordered forest rendered by a layout-owned React Flow projection. It has one domain **Focused** Node, separate **Editing** state, and application-owned keyboard commands. React Flow selection, freeform position changes, and its graph-editor keyboard behavior are already non-authoritative. See `CONTEXT.md` and [React Flow layout-owned research](reactflow-layout-owned-mindmap.md).

The accessibility decision therefore needs to make the current Focused Node perceivable and operable without making DOM focus, React Flow selection, or canvas position a second source of truth.

## What the platform and standards require

### Keyboard equivalence and an exit path

WCAG 2.1.1 requires all functionality to be operable through a keyboard interface unless the function truly depends on the path of movement. It explicitly notes that moving or resizing an object to an endpoint is not path-dependent; pointer-only Node controls therefore need keyboard alternatives. [WCAG 2.2: Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)

WCAG 2.1.2 requires that a keyboard user can leave any component they can enter. If leaving requires something other than ordinary Tab/arrow keys or a standard exit method, the escape method must be disclosed. This applies to a focus-capturing canvas as well as modal UI. [WCAG 2.2: No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)

For Mindi, the dependent decision should define both the canvas entry and exit route (for example, normal Tab traversal or a documented Escape behavior), and give every pointer-only affordance—including resize, map controls, context actions, and panning/zooming—an equivalent keyboard command or normal semantic control.

### Focus is not selection, and visual focus must remain visible

The APG Tree View Pattern distinguishes DOM focus from selection. It permits selection to follow focus in some single-select trees, but says that choice can help or severely degrade accessibility depending on the application. The pattern also defines keyboard tree navigation and a labelled tree/treeitem/group semantic model when the rendered widget actually behaves like a tree. [WAI-ARIA APG: Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)

WCAG 2.4.7 requires a visible focus indicator for keyboard operation; W3C lists `:focus-visible`, a user-agent indicator, and an author-supplied indicator as sufficient techniques. [WCAG 2.2: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)

WCAG 1.4.11 requires visual information needed to identify UI components and states, and graphical information needed to understand content, to reach a 3:1 contrast ratio against adjacent colors. This includes a custom focus indicator and meaningful graph edges/states. [WCAG 2.2: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)

WCAG 2.4.11 adds that a focused component must not be entirely hidden by author-created sticky or overlaying UI; an overlay can also undermine non-text contrast. This matters for a bottom action bar, Sheet, toast, or virtual keyboard-adjacent UI that may cover a focused Node or its editor. [WCAG 2.2: Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)

### Two valid composite-focus techniques

APG documents two ways to represent one active item within a composite widget:

| Technique | What receives DOM focus | What changes while navigating | Strengths for a canvas | Costs to assess |
| --- | --- | --- | --- | --- |
| **Roving `tabindex`** | The active Node | Move DOM focus to the new active Node; exactly one Node has `tabindex="0"`, other Nodes use `-1` | Uses ordinary browser focus and makes each Node directly reachable to assistive tech | DOM focus changes can trigger browser/React Flow behavior and must remain synchronized with Mindi's Focused ID |
| **`aria-activedescendant`** | One labelled, tabbable canvas/composite container | Keep DOM focus on the container; point `aria-activedescendant` to the active Node's ID | Clean separation between a stable canvas focus host and Mindi's Focused Node; one tab stop | The referenced element must meet ARIA DOM-relationship rules; the app must update the visual indicator and scroll/pan the active Node into view |

The APG describes the required mechanics for both techniques. With `aria-activedescendant`, the container is in the tab sequence, its referenced active item is exposed to assistive technology as focused, and each navigation command updates the attribute, visual indicator, and visibility of the active item. With roving focus, only one item belongs in the tab sequence at a time. [WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

MDN describes the same alternatives and warns against adding positive `tabindex` values; its composite-widget guidance also notes that the arrow-key model should be scoped to the widget, while Tab moves between page controls. [MDN: Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets)

Neither technique requires representing the visual, spatial graph as a literal `role="tree"`. A tree role commits the product to tree semantics, including hierarchy/expandability expectations and the APG keyboard model. The decision can instead use a labelled application/canvas region plus a text outline/browser as the semantic tree representation, or choose a true tree-like composite if Mindi's canvas commands and announcements fully match it. This is a product/semantic choice, not something React Flow decides.

### Names, roles, and descriptions

React Flow defaults interactive Node wrappers to `role="group"`; individual Nodes expose `ariaRole`, `ariaLabel`, `focusable`, and `domAttributes`. Its documentation warns not to put `role="button"` on a Node wrapper that already contains interactive controls; the correct role belongs on the actual control. [React Flow: Accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [React Flow Node type](https://reactflow.dev/api-reference/types/node)

React Flow also permits application-specific accessibility text through `ariaLabelConfig`, including localized Node keyboard descriptions and control labels. [React Flow: `AriaLabelConfig`](https://reactflow.dev/api-reference/types/aria-label-config)

Relevant options for the later decision include:

1. Give the canvas a visible heading or an `aria-label` such as the Map name plus “mind map”, and make its instructions discoverable without forcing them into every Node name.
2. Give every Focusable Node an accessible name derived from its plain-text Markdown content, plus concise structural context where useful (for example root/child and ordinal). Do not make an empty raw-Markdown editor depend only on placeholder text for its accessible name.
3. Keep content-editing inputs as native text controls with their own explicit labels/descriptions; do not replace their text-editing semantics with a generic Node role.
4. Treat edges as supplementary presentation unless an edge has an independent user action or conveys information unavailable from the Node hierarchy. React Flow lets an edge have an ARIA label if the product needs it. [React Flow: Accessibility](https://reactflow.dev/learn/advanced-use/accessibility)

### React Flow built-ins must be reconciled with the domain keymap

React Flow's default a11y behavior gives Nodes/Edges Tab focus, uses Enter/Space for selection, uses Escape to clear selection, and permits arrow-key motion of draggable selected Nodes. It can automatically pan when a Node receives DOM focus. These are useful defaults for a freeform graph editor, but conflict with Mindi's layout ownership, dedicated Focused/Editing modes, and prototype key loop. [React Flow: Accessibility](https://reactflow.dev/learn/advanced-use/accessibility)

Its component API exposes `nodesFocusable`, `edgesFocusable`, `disableKeyboardA11y`, `autoPanOnNodeFocus`, `deleteKeyCode`, and related interaction key bindings; it documents that `disableKeyboardA11y` disables its selection/arrow-move features, not necessarily ordinary Tab focus. [React Flow component reference](https://reactflow.dev/api-reference/react-flow)

Consequently the dependent decision needs to choose one coherent boundary:

| Boundary option | React Flow configuration direction | Responsibility retained by Mindi |
| --- | --- | --- |
| **Custom composite canvas** | Disable Node/Edge focusability and React Flow keyboard graph editing; use one application-managed canvas focus host | All traversal, Focused announcements, Escape behavior, and visibility pan |
| **Roving Node focus** | Keep only Nodes focusable; disable React Flow selection/movement/delete shortcuts that conflict; set `autoPanOnNodeFocus` only if it matches Mindi's visibility rule | Synchronize DOM-focused Node with Focused ID and constrain Tab/arrow behavior |

This is not a recommendation to pick either option. Both must avoid accepting React Flow selection or keyboard position changes as Mindi state.

### Announcements and status messages

`aria-live` identifies an element whose updates user agents and assistive technologies should announce; MDN notes that the role and `aria-live` setting determine update priority. [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)

React Flow has a built-in assertive live region for its graph-editor movement messages and permits custom `ariaLabelConfig`. [React Flow: Accessibility](https://reactflow.dev/learn/advanced-use/accessibility)

The Mindi decision should determine whether that built-in region is disabled/replaced when React Flow keyboard graph editing is disabled. Candidate announcements to assess:

- Focus transition: Node name plus useful hierarchy/order context, without reading the entire Markdown body repeatedly.
- Structural command result: “Moved X under Y”, “Detached X to root”, “Deleted X and N descendants”, or a failure/disabled reason.
- Mode transition: editing started, committed, or cancelled.
- Async or persisted status only when it affects the user's next action (for example import validation results), rather than announcing every layout rerun or autosave.

Avoid duplicating messages: if focus itself conveys a Node name through the chosen composite technique, a second live message for exactly the same transition can become noisy. The priority (`polite` versus `assertive`) and exact wording remain product-policy choices.

### Motion and mobile/touch constraints

WCAG 2.3.3 says interaction-triggered motion animation must be disableable unless essential, and explicitly identifies `prefers-reduced-motion` as a technique. It distinguishes essential scrolling movement from decorative movement. [WCAG 2.2: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

WCAG 2.5.8 requires pointer targets to be at least 24 by 24 CSS pixels unless an exception applies, and calls out touchscreen and limited-precision input as beneficiaries. It allows an equivalent larger control as an exception, but encourages practical alternatives where dense spatial content makes direct targets difficult. [WCAG 2.2: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

For the Mindi canvas, the later policy should decide:

- Whether viewport moves/layout transitions animate at all and, if so, how `prefers-reduced-motion` changes them.
- Minimum target size/spacing for resize handles, Node actions, and canvas controls; command palette/context menu alternatives may be relevant for dense Nodes.
- How the focused Node/editor remains visible above the mobile bottom Sheet, action bar, and virtual keyboard, while preserving the requirement not to obscure focus.
- Whether touch focus/activation makes the same domain Focused Node current as keyboard navigation does; APG says pointer activation of a composite item should update the component's active focus representation consistently with keyboard navigation. [WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

## Testable evidence checklist for the dependent decision

Whatever policy ticket 28 selects, acceptance tests can verify these externally observable outcomes:

1. A keyboard user can enter the labelled Map canvas, navigate its Focused Node model, invoke every available canvas action without a pointer, and leave the canvas without becoming trapped.
2. Assistive technology receives a meaningful active/focus identity for the current Node, while editing exposes a normal labelled text control.
3. The visual Focused indicator is persistent, distinguishable from color-slot decoration alone, sufficiently contrasting, and not wholly hidden by shell overlays or the keyboard-aware action bar.
4. React Flow's built-in selection, Node-arrow movement, and delete behavior do not compete with the Mindi keymap or mutate layout-owned positions.
5. Structural changes produce non-duplicative, useful feedback; they do not flood a live region with layout/autosave noise.
6. Motion respects the user's reduced-motion preference, and pointer controls meet target-size/alternative-control requirements on mobile.

## Primary sources

| Source | What it supports |
| --- | --- |
| [WAI-ARIA APG: Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) | Tree semantics, keyboard model, focus/selection distinction, `aria-activedescendant` option. |
| [WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) | Roving `tabindex` and `aria-activedescendant` mechanics; pointer/keyboard active-item synchronization. |
| [WCAG 2.2: Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) | Keyboard equivalent requirement. |
| [WCAG 2.2: No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html) | Enter/exit requirement. |
| [WCAG 2.2: Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) and [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) | Focus indicator and graphical/UI contrast. |
| [WCAG 2.2: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) | Overlay/sticky chrome constraint. |
| [WCAG 2.2: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Reduced-motion and mobile pointer-target evidence. |
| [React Flow: Accessibility](https://reactflow.dev/learn/advanced-use/accessibility), [component reference](https://reactflow.dev/api-reference/react-flow), and [Node type](https://reactflow.dev/api-reference/types/node) | React Flow roles, focus/keyboard defaults, labels, and configuration boundary. |
| [MDN: Keyboard-navigable widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets) and [ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) | Browser-level composite focus and live-region behavior. |
