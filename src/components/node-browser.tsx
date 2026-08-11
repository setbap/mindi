import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Circle, Search } from "lucide-react";

import { focusedIdOf, type InteractionMode } from "@/domain/interaction";
import {
  browserTreeGuides,
  searchNodes,
  type BrowserTreeGuides,
} from "@/domain/node-browser";
import type { MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

interface NodeBrowserProps {
  map: MapRecord;
  mode: InteractionMode;
  onFocus: (nodeId: string) => void;
  onReveal: (nodeId: string) => void;
  /** `panel` = dock card; `sheet` = flush list for mobile Vaul drawers. */
  variant?: "panel" | "sheet";
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

function TreeGuideRail({
  depth,
  guides,
}: {
  depth: number;
  guides: BrowserTreeGuides;
}) {
  if (depth === 0) {
    return null;
  }

  return (
    <span className="browser-tree-guides" aria-hidden="true">
      {guides.continues.map((continues, index) => (
        <span
          key={`stem-${index}`}
          className={cn(
            "browser-tree-guide",
            continues && "browser-tree-guide-continue",
          )}
        />
      ))}
      <span
        className={cn(
          "browser-tree-guide",
          guides.isLast
            ? "browser-tree-guide-end"
            : "browser-tree-guide-branch",
        )}
      />
    </span>
  );
}

export function NodeBrowser({
  map,
  mode,
  onFocus,
  onReveal,
  variant = "panel",
}: NodeBrowserProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const focusedId = focusedIdOf(mode);
  const sheet = variant === "sheet";

  const result = useMemo(() => searchNodes(map, query), [map, query]);
  const navIds =
    result.kind === "results"
      ? result.matches.map((m) => m.id)
      : result.visibleIds;
  const guidesById = useMemo(
    () => browserTreeGuides(result.nodes),
    [result.nodes],
  );

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
      className={cn(
        "flex h-full min-h-0 w-full flex-col",
        sheet
          ? "gap-3 bg-transparent"
          : "border-border bg-card gap-2 rounded-lg border p-3 shadow-sm",
      )}
      data-testid="map-node-browser"
      data-variant={variant}
      aria-labelledby={labelId}
    >
      <h2
        id={labelId}
        className={cn(sheet ? "sr-only" : "text-sm font-semibold")}
      >
        {t("nodeBrowserHeading")}
      </h2>

      <label
        className={cn(
          "relative flex shrink-0 flex-col",
          sheet ? "px-0" : "gap-1",
        )}
      >
        <span className="sr-only">{t("searchNodes")}</span>
        {sheet ? (
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
        ) : null}
        <input
          ref={searchRef}
          type="search"
          value={query}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchNodes")}
          className={cn(
            "border-input bg-background focus-visible:ring-ring rounded-md border focus-visible:ring-2 focus-visible:outline-none",
            sheet
              ? "h-11 w-full ps-9 pe-3 text-base"
              : "px-2 py-1.5 text-sm",
          )}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </label>

      <div
        ref={listRef}
        role="tree"
        aria-label={t("mapNodes")}
        className="browser-tree min-h-0 flex-1 overflow-auto"
      >
        {result.kind === "empty" ? (
          <p className="text-muted-foreground p-2 text-sm" role="status">
            {t("noMatchingNodes")}
          </p>
        ) : (
          <ul
            role="group"
            className={cn("flex flex-col", sheet ? "gap-0.5 py-1" : "gap-0.5 py-0.5")}
          >
            {result.nodes.map((node) => {
              const isFocused = node.id === focusedId;
              const isActive = navIds[activeIndex] === node.id;
              const isEmpty =
                map.nodes[node.id]?.markdown.trim().length === 0;
              const displayLabel = isEmpty ? t("emptyNode") : node.label;
              const guides = guidesById.get(node.id) ?? {
                continues: [],
                isLast: true,
              };
              return (
                <li key={node.id} role="none">
                  <button
                    type="button"
                    role="treeitem"
                    aria-selected={isFocused}
                    aria-level={node.depth + 1}
                    data-browser-node={node.id}
                    data-testid={`browser-node-${node.id}`}
                    className={cn(
                      "hover:bg-accent/50 flex w-full items-stretch rounded-md pe-2 text-start transition-colors",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      sheet ? "min-h-12 py-2.5 text-base" : "py-1 text-sm",
                      isFocused &&
                        "ring-ring bg-accent/60 ring-1 ring-inset",
                      isActive && !isFocused && "bg-muted/60",
                    )}
                    onClick={() => selectNode(node.id)}
                  >
                    <TreeGuideRail depth={node.depth} guides={guides} />
                    {sheet ? (
                      <span className="text-foreground/80 flex items-center ps-1.5">
                        <Circle
                          className={cn(
                            "size-4 shrink-0",
                            isFocused && "fill-primary text-primary",
                          )}
                          aria-hidden
                        />
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "flex min-w-0 flex-1 items-center truncate ps-2",
                        isEmpty && "text-muted-foreground italic",
                      )}
                    >
                      {highlightLabel(displayLabel, query)}
                    </span>
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
