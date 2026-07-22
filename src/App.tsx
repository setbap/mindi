import { useMindiBootstrap } from "./app/use-mindi-bootstrap";

export function App() {
  const { status, catalog, openMap, error } = useMindiBootstrap();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Loading Mindi…</p>
      </main>
    );
  }

  if (status === "error" || !catalog || !openMap) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="alert">{error ?? "Mindi failed to start."}</p>
      </main>
    );
  }

  const rootId = openMap.rootIds[0];
  const root = openMap.nodes[rootId];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header>
        <p className="text-muted-foreground text-sm">Mindi</p>
        <h1 className="text-2xl font-semibold">{openMap.name}</h1>
      </header>

      <section
        aria-label="Open Map summary"
        role="region"
        className="bg-card text-card-foreground rounded-lg border p-4"
      >
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Catalog Maps</dt>
            <dd>{catalog.maps.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Open Map ID</dt>
            <dd className="font-mono text-xs">{openMap.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Root count</dt>
            <dd>{openMap.rootIds.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Root markdown</dt>
            <dd>{root.markdown === "" ? "Empty" : root.markdown}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
