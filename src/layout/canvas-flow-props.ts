import type { ReactFlowProps } from "@xyflow/react";

/**
 * React Flow interaction boundary for a layout-owned Map canvas.
 * Graph-editor behaviours that would move or select domain Nodes are off.
 */
export const MAP_CANVAS_FLOW_PROPS = {
  nodesDraggable: false,
  nodesConnectable: false,
  nodesFocusable: false,
  edgesFocusable: false,
  edgesReconnectable: false,
  elementsSelectable: false,
  selectNodesOnDrag: false,
  panOnDrag: true,
  panOnScroll: false,
  zoomOnScroll: true,
  zoomOnPinch: true,
  zoomOnDoubleClick: false,
  deleteKeyCode: null,
  selectionKeyCode: null,
  multiSelectionKeyCode: null,
  disableKeyboardA11y: true,
  onlyRenderVisibleElements: true,
  proOptions: { hideAttribution: true },
} as const satisfies Partial<ReactFlowProps>;
