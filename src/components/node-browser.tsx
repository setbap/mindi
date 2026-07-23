import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  focusedIdOf,
  type InteractionMode,
} from "@/domain/interaction";
import { searchNodes } from "@/domain/node-browser";
import type { MapRecord } from "@/domain/types";
import { cn } from "@/lib/utils";

interface NodeBrowserProps {
  map: MapRecord;
  mode: InteractionMode;
  onFocus: (nodeId: string) => void;
  onReveal: (nodeId: string) => void;
}

function highlightLabel(label: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) {
    return label;
  }
  const lower = label.toLowerCase();
  const needle = trimmed.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) {
    return label;
  }
  return (
    <>
      {label.slice(0, index)}
      <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">
        {label.slice(index, index + trimmed.length)}
      </mark>
      {label.slice(index + trimmed.length)}
    </>
  );
}

export function NodeBrowser({
  map,
  mode,
  onFocus,
  onReveal,
}: NodeBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const focusedId = focusedIdOf(mode);

  const result = useMemo(() => searchNodes(map, query), [map, query]);
  const navIds =
    result.kind === "results"
      ? result.matches.map((m) => m.id)
      : result.visibleIds;

  useEffect(() => {
    const index = navIds.indexOf(focusedId);
    if (index >= 0) {
      setActiveIndex(index);
    } else {
      setActiveIndex(0);
    }
  }, [focusedId, navIds]);

  useEffect(() => {
    const activeId = navIds[activeIndex];
    if (!activeId || !listRef.current) {
      return;
    }
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-browser-node="${activeId}"]`,
    );
    el?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, navIds]);

  function selectNode(nodeId: string) {
    onFocus(nodeId);
    onReveal(nodeId);
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      return;
    }
    if (navIds.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navIds.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const id = navIds[activeIndex];
      if (id) {
        selectNode(id);
      }
    }
  }

  return (
    <aside
      className="bg-card/40 flex h-full min-h-0 w-full flex-col gap-2 rounded-lg border p-3"
      data-testid="map-node-browser"
      aria-labelledby={labelId}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={labelId} className="text-sm font-semibold">
          Node browser
        </h2>
      </div>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Search nodes</span>
        <input
          ref={searchRef}
          type="search"
          value={query}
          placeholder="Search…"
          aria-label="Search nodes"
          className="border-input bg-background focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </label>

      <div
        ref={listRef}
        role="tree"
        aria-label="Map nodes"
        className="min-h-0 flex-1 overflow-auto"
      >
        {result.kind === "empty" ? (
          <p className="text-muted-foreground p-2 text-sm" role="status">
            No matching nodes
          </p>
        ) : (
          <ul role="group" className="flex flex-col gap-0.5">
            {result.nodes.map((node) => {
              const isFocused = node.id === focusedId;
              const isActive = navIds[activeIndex] === node.id;
              return (
                <li key={node.id} role="none">
                  <button
                    type="button"
                    role="treeitem"
                    aria-selected={isFocused}
                    data-browser-node={node.id}
                    data-testid={`browser-node-${node.id}`}
                    className={cn(
                      "hover:bg-accent w-full rounded-md px-2 py-1.5 text-left text-sm",
                      isFocused && "ring-ring bg-accent/60 ring-1",
                      isActive && !isFocused && "bg-muted/60",
                    )}
                    style={{ paddingInlineStart: `${0.5 + node.depth * 0.75}rem` }}
                    onClick={() => selectNode(node.id)}
                  >
                    {highlightLabel(node.label, query)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
