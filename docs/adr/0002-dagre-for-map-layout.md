# Dagre is the Map layout engine

Mindi uses `@dagrejs/dagre` as its sole layout engine for the left-to-right, variable-width, multi-Root Map forest. Dagre accepts measured Node dimensions, lays out disconnected components synchronously, and maps cleanly to React Flow's renderer projection. ELK is reserved as a future upgrade only if its routing or configuration depth becomes necessary; `d3-hierarchy` is rejected because it does not naturally support Mindi's variable-width forest.
