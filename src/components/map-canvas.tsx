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
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SmoothStepEdge,
  useNodesInitialized,
  useReactFlow,
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
  onCreateSibling: () => void;
  onCreateChild: () => void;
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

function MapCanvasFlow({
  map,
  mode,
  palette,
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
  onCreateSibling,
  onCreateChild,
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
  const { fitView, getNode, setCenter, getZoom } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [measured, setMeasured] = useState<Record<string, NodeSize>>({});
  const [didFit, setDidFit] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    setMeasured({});
    setDidFit(false);
  }, [map.id]);

  const revealNode = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId);
      if (!node) {
        return;
      }
      const width = node.width ?? node.measured?.width ?? 280;
      const height = node.height ?? node.measured?.height ?? 48;
      const x = node.position.x + width / 2;
      const y = node.position.y + height / 2;
      void setCenter(x, y, {
        zoom: getZoom(),
        duration: prefersReducedMotion ? 0 : 200,
      });
    },
    [getNode, getZoom, prefersReducedMotion, setCenter],
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

  const layout: LayoutResult = useMemo(
    () => layoutMap(map, sizesForMap(map, measured)),
    [map, measured],
  );

  const { nodes, edges } = useMemo(
    () => projectLayoutToFlow(layout, { focusedId }),
    [layout, focusedId],
  );

  const allMeasured = Object.keys(map.nodes).every((id) => measured[id]);

  useEffect(() => {
    if (!nodesInitialized || !allMeasured || didFit) {
      return;
    }
    void fitView({ padding: 0.2, duration: 0 });
    setDidFit(true);
  }, [nodesInitialized, allMeasured, didFit, fitView]);

  const contextValue = useMemo(
    () => ({
      map,
      mode,
      palette,
      onFocus,
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
      onFocus,
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
    if (event.key === "Enter") {
      event.preventDefault();
      onCreateSibling();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onCreateChild();
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
        aria-activedescendant={`node-${focusedId}`}
        className={cn(
          "bg-background focus-visible:ring-ring relative h-full min-h-0 w-full overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none",
        )}
        onKeyDown={onKeyDown}
        data-testid="map-canvas"
      >
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
          className="h-full w-full"
        />
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
