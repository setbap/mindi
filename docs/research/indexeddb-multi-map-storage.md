# IndexedDB multi-Map local storage options

**Ticket:** Research IndexedDB multi-map local storage options  
**Scope:** Local persistence for Mindi’s offline React application: a Map catalog, independently loadable Map forests, autosave, Palette configuration, import/export snapshots, schema evolution, transactions, and tests.  
**Date:** 2026-07-18  
**Sources:** IndexedDB standard/MDN plus the official `idb` and Dexie documentation only.

## Recommendation

Use **IndexedDB through the small, typed `idb` wrapper** as the default persistence primitive for this small offline React application. Put it behind one application-owned persistence boundary; React components must not call the database directly.

This is a recommendation for the later storage decision, not that decision itself. Dexie remains a good alternative if live database queries become the chosen state-subscription seam or Map queries become materially richer. Raw IndexedDB is viable but imposes event-based plumbing with no benefit for Mindi’s initial shape. Do not use `localStorage` for Map data.

## Why IndexedDB

IndexedDB is an asynchronous, transactional, same-origin object database. It stores structured-cloneable objects, supports object stores and indexes, and is designed for sizable client-side structured data rather than the small key/value use case of Web Storage. That directly fits offline Map records and binary-safe future export/import attachments. [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)

Unlike a service-worker cache, this is durable application data: an installed app can load and mutate Maps without a network request. It is still browser-controlled, origin-scoped storage, so export remains the user’s portable backup path and writes must surface quota/open failures rather than silently claiming persistence succeeded. [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## Storage shape to evaluate

The current domain invariants favour a small number of coarse records rather than a graph-normalized database:

| Concern | Candidate record | Reason |
| --- | --- | --- |
| Map catalog | `catalog` singleton or `maps` metadata records | Lists Map ID, name, Root order, timestamps, and whichever Map is current without loading forests. |
| Map forest | one `map` record per Map ID | A whole ordered Node forest is loaded and saved together, preserving the command-model invariant atomically. |
| Palette/configuration | `settings` singleton | Keeps application configuration independent of a Map snapshot and makes its scope explicit. |
| Import/export | no separate long-lived store initially | Serialize/validate a versioned snapshot at the persistence boundary; import should validate before its single write transaction. |

The final storage ticket must settle exact record shapes, catalog order, autosave timing, snapshot format/version, and whether a Node-level store is ever warranted. Avoid adding indexes until a real query needs them: both IndexedDB and Dexie expose indexes for retrieval, but the primary access path is by Map ID. [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [Dexie `Version.stores()`](https://dexie.org/docs/Version/Version.stores%28%29)

## Option comparison

| Option | Strengths for Mindi | Cost / risk | Fit |
| --- | --- | --- | --- |
| Raw IndexedDB | Native API; full access to transactions, stores, indexes, and version upgrades. | Event/request API, manual request/error/transaction completion handling, and more test scaffolding. | Technically sound, unnecessarily low-level. |
| `idb` | Promise API that closely mirrors IndexedDB, typed `DBSchema`, explicit upgrade/blocked/blocking hooks, and `tx.done` commit signal. Tiny stated bundle size. | Still exposes IndexedDB transaction-lifetime rules; app must keep the boundary disciplined. | **Default.** Minimal abstraction while retaining clear schema/migration control. |
| Dexie | Higher-level tables/querying, declarative versions, transactions, and React `useLiveQuery` subscriptions. | More database-specific API and a broader abstraction than initial coarse Map records require. | Choose only if reactive query subscriptions or richer indexed queries are a real requirement. |

`idb`’s official README documents `openDB` migrations, upgrade-blocking callbacks, typed schema declaration, multi-record transactions, and `tx.done` as the successful-commit signal. [idb README](https://github.com/jakearchibald/idb) Dexie documents schema declarations, transactions, and a React `useLiveQuery` hook which re-renders when observed Dexie queries change. [Dexie `Version.stores()`](https://dexie.org/docs/Version/Version.stores%28%29), [Dexie React tutorial](https://dexie.org/docs/Tutorial/React), [Dexie transactions](https://dexie.org/docs/Transaction/Transaction)

## Autosave and atomicity

Treat each completed domain command as the autosave unit. Persist the changed Map forest and any affected catalog metadata in one `readwrite` transaction, and report success only after the transaction completes. This prevents a rename/restructure/create command from leaving catalog and Map state out of agreement if the browser rejects or aborts the write. IndexedDB transactions explicitly define accessed stores and read-only/read-write mode. [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

With `idb`, await both the writes and `tx.done`; the wrapper says that `tx.done` resolves only on successful completion and rejects on transaction error. Do not await unrelated work such as `fetch` inside the transaction: the wrapper documents that IndexedDB transactions auto-close when they have no queued database work. [idb README—transaction lifetime](https://github.com/jakearchibald/idb)

Autosave means command completion is durable; it does **not** mean write on every keystroke. The later product decision should choose an editing policy (for example, an intentional debounced draft policy) and define how losing focus, app close, and an update prompt flush it.

## Schema versions and migrations

Schema changes need a database version plus an upgrade migration. Plain IndexedDB runs `onupgradeneeded` when opening a new or higher version, and object-store changes belong there; `idb` exposes the same work as its `upgrade` callback, including an upgrade transaction for migrations. [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [idb `openDB`](https://github.com/jakearchibald/idb)

Keep two different versions explicit:

- **Database schema version:** migrates stores/indexes and persistent records on open.
- **Export snapshot format version:** validates and migrates imported/exported data at the boundary, independent of the local database’s current schema.

Each migration must be deterministic, preserve valid Maps, and be covered by a fixture from the preceding version. Handle blocked/older-tab upgrades deliberately: `idb` supplies `blocked` and `blocking` callbacks for that state. [idb `openDB`](https://github.com/jakearchibald/idb)

## Testing seam

Expose a narrow asynchronous `MapRepository` port: load catalog; load Map; save the effects of a command; replace/import a validated Map; delete Map; load/save configuration; export a snapshot. Tests of domain commands should use an in-memory repository fake and assert observable persisted snapshots. A small set of repository contract tests should run the same behavior against an IndexedDB test implementation, including migration fixtures, failed writes, and multi-store atomic updates.

This keeps browser database mechanics out of React and domain tests. The final storage choice may select `fake-indexeddb` or a browser integration environment for the contract implementation; that is a test-tool decision, not settled by this research.

## Why not `localStorage`

`localStorage` is a synchronous, origin-scoped key/value API. It can persist across browser restarts, but Web Storage is specifically for key/value pairs, whereas IndexedDB is asynchronous structured storage with object stores, indexes, and transactions. Storing whole Maps as JSON strings would require the app to implement indexing, migrations, atomic multi-record updates, and serialization boundaries itself while blocking the main thread for storage operations. [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API), [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

It may remain appropriate for an intentionally noncritical UI preference, but it is not a sound persistence substrate for Map catalog, forests, import/export, or autosave.

## Decision support

The smallest coherent initial design is IndexedDB plus `idb`, hidden behind a `MapRepository`, with coarse Map records and transactional command persistence. Revisit Dexie only if the app deliberately makes persistent queries the UI’s reactive source of truth. Preserve the remaining product choices—record shape, Palette scope, editing flush policy, import conflict policy, and retention/quota UX—for the storage decision ticket.

## Primary sources

| Source | What it establishes |
| --- | --- |
| [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Structured clone storage, object stores/indexes, transactions, asynchrony, origin/quota constraints. |
| [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) | Open/upgrade lifecycle and schema-version mechanics. |
| [IndexedDB 3.0](https://www.w3.org/TR/IndexedDB-3/) | The underlying platform specification. |
| [idb README](https://github.com/jakearchibald/idb) | Promise wrapper API, migration hooks, typed schema, transaction completion/lifetime. |
| [Dexie React tutorial](https://dexie.org/docs/Tutorial/React) | `useLiveQuery` query observation in React. |
| [Dexie `Version.stores()`](https://dexie.org/docs/Version/Version.stores%28%29) | Declarative store/index schema and versioned changes. |
| [Dexie transactions](https://dexie.org/docs/Transaction/Transaction) | Transaction API and completion/abort lifecycle. |
| [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) | `localStorage`’s origin-scoped key/value model and persistence. |
