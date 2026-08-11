import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SmoothStepEdge,
  useReactFlow,
  useStore,
  useStoreApi,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NodeView } from "@/components/node-view";
import type { InteractionMode } from "@/domain/interaction";
import { focusedIdOf, isEditing } from "@/domain/interaction";
import { paletteColor } from "@/domain/palette";
import type { CatalogRecord, MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";
import { MAP_CANVAS_FLOW_PROPS } from "@/layout/canvas-flow-props";
import {
  layoutMap,
  type LayoutResult,
  type NodeSize,
} from "@/layout/layout-map";
import {
  createLatestLayoutScheduler,
  layoutScalePolicy,
  type LatestLayoutScheduler,
} from "@/layout/scale-policy";
import {
  MINDI_NODE_TYPE,
  projectLayoutToFlow,
  type FlowEdgeData,
  type FlowNodeData,
} from "@/layout/project-layout";
import { cn } from "@/lib/utils";

interface MapCanvasProps {
  map: MapRecord;
  mode: InteractionMode;
  palette: CatalogRecord["palette"];
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTypeCharacter: (value: string) => void;
  onArrow: (direction: "up" | "down" | "left" | "right") => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCommitWidth: (nodeId: string, width: number) => void;
  onEscapeExit?: () => void;
}

export interface MapCanvasHandle {
  revealNode: (nodeId: string) => void;
  focusHost: () => void;
}

interface CanvasNodeContextValue {
  map: MapRecord;
  mode: InteractionMode;
  palette: CatalogRecord["palette"];
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onCommitWidth: (nodeId: string, width: number) => void;
  onMeasured: (nodeId: string, size: NodeSize) => void;
}

const CanvasNodeContext = createContext<CanvasNodeContextValue | null>(null);

function estimateHeight(markdown: string): number {
  const lines = Math.max(1, markdown.split("\n").length);
  return Math.max(48, 28 + lines * 20);
}

function sizesForMap(
  map: MapRecord,
  measured: Record<string, NodeSize>,
): Record<string, NodeSize> {
  const sizes: Record<string, NodeSize> = {};
  for (const node of Object.values(map.nodes)) {
    sizes[node.id] = measured[node.id] ?? {
      width: node.width,
      height: estimateHeight(node.markdown),
    };
  }
  return sizes;
}

function ConnectorEdge(props: EdgeProps<Edge<FlowEdgeData>>) {
  const emphasized = Boolean(props.data?.emphasized);
  return (
    <SmoothStepEdge
      {...props}
      pathOptions={{ borderRadius: 8 }}
      style={{
        stroke: emphasized ? "var(--ring)" : "var(--border)",
        strokeWidth: emphasized ? 2 : 1.5,
      }}
      interactionWidth={0}
    />
  );
}

function MindiFlowNode({ id }: NodeProps<Node<FlowNodeData>>) {
  const ctx = useContext(CanvasNodeContext);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const node = ctx?.map.nodes[id];
  const nodeWidth = node?.width;
  const nodeMarkdown = node?.markdown;

  useEffect(() => {
    if (!ctx || !shellRef.current || !node) {
      return;
    }
    // Defer layout measurement while the pointer is previewing a resize.
    if (previewWidth !== null) {
      return;
    }
    const el = shellRef.current;
    const height = el.offsetHeight;
    if (height > 0) {
      ctx.onMeasured(id, { width: node.width, height });
    }
  }, [ctx, id, previewWidth, node, nodeWidth, nodeMarkdown]);

  if (!ctx || !node) {
    return null;
  }

  const displayWidth = previewWidth ?? node.width;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!pointer-events-none !h-px !w-px !border-0 !bg-transparent !opacity-0"
        isConnectable={false}
      />
      <div className="nopan" style={{ width: displayWidth }} ref={shellRef}>
        <NodeView
          node={node}
          mode={ctx.mode}
          accentColor={paletteColor(ctx.palette, node.colorSlot)}
          onFocus={ctx.onFocus}
          onStartEditing={ctx.onStartEditing}
          onDraftChange={ctx.onDraftChange}
          onCommit={ctx.onCommit}
          onCancel={ctx.onCancel}
          onCommitWidth={(width) => {
            ctx.onCommitWidth(id, width);
          }}
          onPreviewWidth={setPreviewWidth}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!pointer-events-none !h-px !w-px !border-0 !bg-transparent !opacity-0"
        isConnectable={false}
      />
    </>
  );
}

const nodeTypes = { [MINDI_NODE_TYPE]: MindiFlowNode };
const edgeTypes = { smoothstep: ConnectorEdge };
const EMPTY_LAYOUT: LayoutResult = { nodes: [], edges: [] };

function MapCanvasFlow({
  map,
  mode,
  palette,
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
  onTypeCharacter,
  onArrow,
  onMoveUp,
  onMoveDown,
  onCommitWidth,
  onEscapeExit,
  canvasRef,
}: MapCanvasProps & { canvasRef: Ref<MapCanvasHandle> }) {
  const { t } = useI18n();
  const focusedId = focusedIdOf(mode);
  const editing = isEditing(mode);
  const { getNode, setCenter, getZoom, viewportInitialized } = useReactFlow();
  const storeApi = useStoreApi();
  const paneWidth = useStore((state) => state.width);
  const paneHeight = useStore((state) => state.height);
  const [measured, setMeasured] = useState<Record<string, NodeSize>>({});
  const [didFit, setDidFit] = useState(false);
  const [deferredLayout, setDeferredLayout] = useState<{
    mapId: string;
    result: LayoutResult;
  } | null>(null);
  const [layingOut, setLayingOut] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const keepHostFocusedRef = useRef(false);
  const prevFocusedIdRef = useRef<string | null>(null);
  const didFitRef = useRef(false);
  const layoutRef = useRef<LayoutResult>(EMPTY_LAYOUT);
  const layoutSchedulerRef = useRef<LatestLayoutScheduler | null>(null);
  if (!layoutSchedulerRef.current) {
    layoutSchedulerRef.current = createLatestLayoutScheduler();
  }
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    setMeasured({});
    setDidFit(false);
    didFitRef.current = false;
    prevFocusedIdRef.current = null;
  }, [map.id]);

  const revealNode = useCallback(
    (
      nodeId: string,
      options?: {
        duration?: number;
        onCentered?: () => void;
      },
    ) => {
      // Instant by default — a 200ms pan felt sluggish for Tab/Enter/arrow chaining.
      const duration = options?.duration ?? 0;
      // Prefer setCenter over fitView: fitView ignores Nodes until RF has
      // measured them, which leaves the initial viewport stuck at origin.
      const tryReveal = (attemptsLeft: number) => {
        const { width: paneW, height: paneH, panZoom } = storeApi.getState();
        if (!panZoom || paneW < 40 || paneH < 40) {
          if (attemptsLeft > 0) {
            requestAnimationFrame(() => tryReveal(attemptsLeft - 1));
          }
          return;
        }
        const node = getNode(nodeId);
        const layoutRect = layoutRef.current.nodes.find(
          (entry) => entry.id === nodeId,
        );
        if (!node && !layoutRect) {
          if (attemptsLeft > 0) {
            requestAnimationFrame(() => tryReveal(attemptsLeft - 1));
          }
          return;
        }
        const width =
          node?.width ?? node?.measured?.width ?? layoutRect?.width ?? 280;
        const height =
          node?.height ?? node?.measured?.height ?? layoutRect?.height ?? 48;
        const x = (node?.position.x ?? layoutRect!.x) + width / 2;
        const y = (node?.position.y ?? layoutRect!.y) + height / 2;
        const zoom = getZoom() || storeApi.getState().transform[2] || 1;
        void setCenter(x, y, {
          zoom,
          duration,
        }).then((ok) => {
          if (ok) {
            options?.onCentered?.();
          } else if (attemptsLeft > 0) {
            requestAnimationFrame(() => tryReveal(attemptsLeft - 1));
          }
        });
      };
      tryReveal(120);
    },
    [getNode, getZoom, setCenter, storeApi],
  );

  useImperativeHandle(
    canvasRef,
    () => ({
      revealNode,
      focusHost: () => hostRef.current?.focus(),
    }),
    [revealNode],
  );

  const onMeasured = useCallback((nodeId: string, size: NodeSize) => {
    setMeasured((prev) => {
      const existing = prev[nodeId];
      if (
        existing &&
        existing.width === size.width &&
        existing.height === size.height
      ) {
        return prev;
      }
      return { ...prev, [nodeId]: size };
    });
  }, []);

  const focusNodeOnCanvas = useCallback(
    (nodeId: string) => {
      onFocus(nodeId);
      hostRef.current?.focus({ preventScroll: true });
    },
    [onFocus],
  );

  useEffect(() => {
    if (!editing) {
      return;
    }
    return () => {
      // Restore keyboard host when leaving Editing (textarea unmounts).
      queueMicrotask(() => {
        hostRef.current?.focus({ preventScroll: true });
      });
    };
  }, [editing]);

  useEffect(() => {
    if (!keepHostFocusedRef.current || editing) {
      return;
    }
    keepHostFocusedRef.current = false;
    hostRef.current?.focus({ preventScroll: true });
  }, [focusedId, editing, map]);

  const nodeCount = Object.keys(map.nodes).length;
  const scalePolicy = layoutScalePolicy(nodeCount, prefersReducedMotion);
  const layoutSizes = useMemo(
    () => sizesForMap(map, measured),
    [map, measured],
  );
  const immediateLayout = useMemo(
    () => (scalePolicy.defer ? null : layoutMap(map, layoutSizes)),
    [layoutSizes, map, scalePolicy.defer],
  );
  const layout =
    immediateLayout ??
    (deferredLayout?.mapId === map.id ? deferredLayout.result : EMPTY_LAYOUT);
  layoutRef.current = layout;

  useEffect(() => {
    const scheduler = layoutSchedulerRef.current!;
    if (!scalePolicy.defer) {
      scheduler.cancel();
      setLayingOut(false);
      return;
    }

    setLayingOut(true);
    scheduler.request(
      () => layoutMap(map, layoutSizes),
      (result) => {
        setDeferredLayout({ mapId: map.id, result });
        setLayingOut(false);
      },
    );
    return () => scheduler.cancel();
  }, [layoutSizes, map, scalePolicy.defer]);

  const { nodes, edges } = useMemo(
    () => projectLayoutToFlow(layout, { focusedId }),
    [layout, focusedId],
  );

  const prevNodeCountRef = useRef(Object.keys(map.nodes).length);
  useEffect(() => {
    const count = Object.keys(map.nodes).length;
    if (count > prevNodeCountRef.current) {
      keepHostFocusedRef.current = true;
    }
    prevNodeCountRef.current = count;
  }, [map.nodes]);

  // Same path as Node browser `onReveal`: when focus moves (arrows, create,
  // browser, canvas click), center that Node immediately.
  useEffect(() => {
    const previous = prevFocusedIdRef.current;
    prevFocusedIdRef.current = focusedId;
    if (previous === null || previous === focusedId) {
      return;
    }
    if (!viewportInitialized || paneWidth < 40 || paneHeight < 40) {
      return;
    }
    revealNode(focusedId);
  }, [
    focusedId,
    revealNode,
    viewportInitialized,
    paneWidth,
    paneHeight,
  ]);

  const layoutReady = scalePolicy.defer
    ? !layingOut && layout.nodes.length > 0
    : layout.nodes.length > 0;
  const focusedInFlow = nodes.some((node) => node.id === focusedId);

  useEffect(() => {
    if (
      didFitRef.current ||
      !viewportInitialized ||
      !layoutReady ||
      !focusedInFlow ||
      paneWidth < 40 ||
      paneHeight < 40
    ) {
      return;
    }

    revealNode(focusedId, {
      duration: 0,
      onCentered: () => {
        if (didFitRef.current) {
          return;
        }
        didFitRef.current = true;
        setDidFit(true);
      },
    });
  }, [
    viewportInitialized,
    layoutReady,
    focusedInFlow,
    paneWidth,
    paneHeight,
    revealNode,
    focusedId,
    didFit,
    nodes,
  ]);

  const contextValue = useMemo(
    () => ({
      map,
      mode,
      palette,
      onFocus: focusNodeOnCanvas,
      onStartEditing,
      onDraftChange,
      onCommit,
      onCancel,
      onCommitWidth,
      onMeasured,
    }),
    [
      map,
      mode,
      palette,
      focusNodeOnCanvas,
      onStartEditing,
      onDraftChange,
      onCommit,
      onCancel,
      onCommitWidth,
      onMeasured,
    ],
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("textarea, input")) {
      return;
    }
    if (editing) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onEscapeExit?.();
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onStartEditing(focusedId);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (event.altKey) {
        onMoveUp();
        return;
      }
      onArrow("up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (event.altKey) {
        onMoveDown();
        return;
      }
      onArrow("down");
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onArrow("left");
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onArrow("right");
      return;
    }

    if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onTypeCharacter(event.key);
    }
  }

  return (
    <CanvasNodeContext.Provider value={contextValue}>
      <div
        ref={hostRef}
        role="application"
        tabIndex={0}
        aria-label={t("mapCanvas")}
        aria-activedescendant={`canvas-active-${focusedId}`}
        className={cn(
          "map-canvas-host bg-background relative h-full min-h-0 w-full overflow-hidden outline-none",
        )}
        onKeyDown={onKeyDown}
        data-testid="map-canvas"
        data-layout-animation={scalePolicy.animate ? "on" : "off"}
      >
        <span id={`canvas-active-${focusedId}`} className="sr-only">
          {map.nodes[focusedId]?.markdown || t("emptyNode")}
        </span>
        {scalePolicy.warn ? (
          <p
            className="bg-card/95 absolute top-2 right-2 z-10 rounded-md border px-2 py-1 text-xs shadow-sm"
            role="status"
          >
            {t("largeMapWarning")}
          </p>
        ) : null}
        {layingOut ? (
          <p className="bg-card/95 absolute right-2 bottom-2 z-10 rounded-md border px-2 py-1 text-xs shadow-sm">
            {t("layingOut")}
          </p>
        ) : null}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          {...MAP_CANVAS_FLOW_PROPS}
          onNodesChange={() => {
            /* Layout owns positions; ignore RF move/select changes. */
          }}
          onEdgesChange={() => {
            /* Connectors are display-only. */
          }}
          className={cn(
            "h-full w-full",
            !scalePolicy.animate &&
              "[&_.react-flow__node]:!transition-none [&_.react-flow__viewport]:!transition-none",
          )}
        >
          <Background
            id="map-grid"
            variant={BackgroundVariant.Lines}
            gap={24}
            size={1}
            lineWidth={1}
            color="var(--canvas-grid-color)"
          />
        </ReactFlow>
      </div>
    </CanvasNodeContext.Provider>
  );
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <MapCanvasFlow {...props} canvasRef={ref} />
      </ReactFlowProvider>
    );
  },
);
