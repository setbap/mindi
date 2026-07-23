# Mindi

Mindi is a local-first, offline-capable mind-map web app for organizing
hierarchical Markdown notes. Maps are stored in the browser with IndexedDB, so
the core editing workflow does not require an account, a server, or a network
connection.

Each Map is an ordered forest: it can contain multiple independent Root trees.
Mindi owns the structure and ordering, Dagre computes a left-to-right layout,
and React Flow renders the result as a keyboard-operable canvas.

## Features

- Create, rename, switch, and delete locally persisted Maps.
- Edit Nodes as raw Markdown with CommonMark and GFM rendering.
- Navigate and edit from the keyboard:
  - arrow keys navigate the ordered forest;
  - `Enter` creates a sibling;
  - `Tab` creates a child;
  - typing starts Editing;
  - `Enter` commits an edit and `Escape` discards it.
- Create additional Roots and restructure a Map with Move up/down, Move under,
  Swap with parent, Detach, and recursive Delete.
- Resize Nodes and assign one of nine editable global Palette slots.
- Undo and redo the latest 100 Node and structure commands per open Map.
- Search and navigate the semantic Node browser as an accessible alternative
  to the canvas.
- Use English or Persian application chrome. Persian uses RTL chrome while the
  Map layout and traversal remain left-to-right.
- Export the Open Map or every Map as versioned `.mindi.json`.
- Import valid Maps additively with selection, validation, ID remapping,
  collision-safe names, and optional Palette restoration.
- Install Mindi as a PWA and launch the precached application shell offline.
- Receive explicit offline-ready and update-ready notices. Updates never
  discard an active Editing draft without confirmation.
- Work without a hard Node limit. At 512 Nodes Mindi warns about possible
  performance degradation and applies large-layout safeguards.

## Technology

- React 19 and TypeScript
- Vite and Tailwind CSS
- React Flow for canvas rendering
- Dagre for layout
- IndexedDB through `idb`
- `react-markdown` and `remark-gfm`
- Vite PWA and Workbox
- Vitest, React Testing Library, and Playwright

## Requirements

- Node.js 22 or newer. The repository pins the development version in
  `.node-version`.
- Corepack, used to provide the pinned `pnpm@9.15.0`.
- A local Google Chrome installation for the configured Playwright project.

## Local development

Clone the repository, enable Corepack, install dependencies, and start Vite:

```bash
git clone https://github.com/setbap/mindi.git
cd mindi
corepack enable
pnpm install
pnpm dev
```

Vite prints the local development URL, normally
`http://localhost:5173`.

Browser data is stored locally in IndexedDB. To simulate a first launch, clear
the site's storage in browser developer tools or use a fresh browser profile.

## Production build

Build and serve the production application locally:

```bash
pnpm build
pnpm preview
```

The build performs TypeScript project compilation and then emits the app,
manifest, service worker, and Workbox precache into `dist/`.

PWA and offline behavior must be tested against this production build. The Vite
development server is not the release offline environment.

## Validation commands

| Command             | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `pnpm typecheck`    | Check all TypeScript projects without emitting files  |
| `pnpm lint`         | Run ESLint                                            |
| `pnpm format`       | Format the repository with Prettier                   |
| `pnpm format:check` | Check formatting without changing files               |
| `pnpm test`         | Run the Vitest unit and component suite once          |
| `pnpm test:watch`   | Run Vitest in watch mode                              |
| `pnpm build`        | Typecheck and create the production/PWA build         |
| `pnpm test:e2e`     | Build, serve, and run the Playwright acceptance suite |

To run one unit test file:

```bash
pnpm test src/domain/mindi-json.test.ts
```

To run one Playwright file against an existing production build:

```bash
pnpm build
pnpm exec playwright test e2e/pwa.test.ts --workers=1
```

## Project structure

```text
src/
  app/            Application controller and persisted command coordination
  components/     Canvas, Node browser, Map manager, commands, and UI elements
  domain/         Map, forest, interaction, import/export, and history logic
  i18n/           English and Persian messages
  layout/         Dagre layout, React Flow projection, and scale safeguards
  persistence/    Typed MapRepository and IndexedDB implementation
  pwa/            Install, offline-ready, and update lifecycle
  shell/          Browser viewport and responsive-shell bindings
  test/           Test setup and deterministic fixtures
e2e/              Production Playwright acceptance tests
docs/
  adr/            Architecture decision records
  research/       Supporting technical research
  SPEC.md         Authoritative implementation specification
CONTEXT.md        Canonical product and domain language
```

## Architecture and data

React components do not access IndexedDB directly. The application controller
uses a typed `MapRepository`, with each Map persisted as one complete ordered
forest record and catalog/settings stored separately.

Persisted Map data includes:

- Map ID and name;
- ordered Root IDs;
- Node IDs, raw Markdown, width, Color slot, parent ID, and ordered child IDs.

Canvas positions, viewport state, Focused state, Editing drafts, and Undo/Redo
history are transient. Layout positions are always recomputed by Dagre.

The global catalog also stores Map metadata, the Open Map ID, the nine-color
Palette, the selected language, and the persistence schema version.

## Import and export

Mindi's native transfer format uses:

- file extension: `.mindi.json`;
- media type: `application/vnd.mindi+json`;
- a versioned envelope containing one or more Maps and a Palette snapshot.

Import never replaces an existing Map or automatically switches the Open Map.
Every imported Map and Node receives a fresh ID. Invalid Maps are reported
without preventing other valid Maps in the same file from being selected and
imported.

## Offline behavior

The production build uses Workbox `generateSW` with a precached SPA shell and
`/index.html` navigation fallback. Map data remains in IndexedDB and is not
stored in the service-worker cache.

Mindi only shows its install control when the browser reports installation
eligibility. Offline readiness is announced only after the service worker
confirms that the shell is ready. New versions use a prompted update flow, and
an active Editing draft must be finished or explicitly discarded before reload.

## Contributing

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:e2e
```

Use the canonical domain terms in `CONTEXT.md`. Product behavior and acceptance
requirements live in `docs/SPEC.md`; architecture decisions live in
`docs/adr/`.
