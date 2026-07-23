import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
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
import type { MapRecord } from "@/domain/types";
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
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onCreateSibling: () => void;
  onCreateChild: () => void;
  onTypeCharacter: (value: string) => void;
  onArrow: (direction: "up" | "down" | "left" | "right") => void;
}

interface CanvasNodeContextValue {
  map: MapRecord;
  mode: InteractionMode;
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
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
  if (!ctx) {
    return null;
  }
  const node = ctx.map.nodes[id];
  if (!node) {
    return null;
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!pointer-events-none !h-px !w-px !border-0 !bg-transparent !opacity-0"
        isConnectable={false}
      />
      <div
        className="nopan"
        style={{ width: node.width }}
        ref={(el) => {
          if (!el) {
            return;
          }
          // Use offsetHeight (layout box), not getBoundingClientRect — RF zoom
          // would otherwise feed viewport-scaled sizes back into Dagre forever.
          const height = el.offsetHeight;
          if (height > 0) {
            ctx.onMeasured(id, { width: node.width, height });
          }
        }}
      >
        <NodeView
          node={node}
          mode={ctx.mode}
          onFocus={ctx.onFocus}
          onStartEditing={ctx.onStartEditing}
          onDraftChange={ctx.onDraftChange}
          onCommit={ctx.onCommit}
          onCancel={ctx.onCancel}
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
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
  onCreateSibling,
  onCreateChild,
  onTypeCharacter,
  onArrow,
}: MapCanvasProps) {
  const focusedId = focusedIdOf(mode);
  const editing = isEditing(mode);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [measured, setMeasured] = useState<Record<string, NodeSize>>({});
  const [didFit, setDidFit] = useState(false);

  useEffect(() => {
    setMeasured({});
    setDidFit(false);
  }, [map.id]);

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
      onFocus,
      onStartEditing,
      onDraftChange,
      onCommit,
      onCancel,
      onMeasured,
    }),
    [
      map,
      mode,
      onFocus,
      onStartEditing,
      onDraftChange,
      onCommit,
      onCancel,
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
      onArrow("up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
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
        role="application"
        tabIndex={0}
        aria-label="Map canvas"
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

export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MapCanvasFlow {...props} />
    </ReactFlowProvider>
  );
}
