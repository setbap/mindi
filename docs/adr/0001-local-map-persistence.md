# Local Map persistence uses IndexedDB and a global Palette

Mindi persists Maps in IndexedDB through an application-owned `MapRepository` using `idb`: each Map is a complete ordered-forest record, while catalog and settings metadata are stored separately and updated transactionally. The Palette is one global persisted setting shared by every Map. This favors atomic offline Map commands and consistent Color-slot meaning over raw IndexedDB plumbing, Dexie-driven query subscriptions, or per-Map Palette duplication.

## Considered Options

- Raw IndexedDB — rejected for its event-based plumbing at this scale.
- Dexie — deferred unless reactive database queries become a real UI need.
- Per-Map Palettes — rejected because Color slots should mean the same thing throughout the app.
