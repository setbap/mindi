import { describe, expect, it } from "vitest";

import { MAP_CANVAS_FLOW_PROPS } from "./canvas-flow-props";

describe("MAP_CANVAS_FLOW_PROPS", () => {
  it("disables React Flow graph-editor Node mutations", () => {
    expect(MAP_CANVAS_FLOW_PROPS.nodesDraggable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.nodesConnectable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.nodesFocusable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.edgesFocusable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.edgesReconnectable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.elementsSelectable).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.selectNodesOnDrag).toBe(false);
    expect(MAP_CANVAS_FLOW_PROPS.deleteKeyCode).toBeNull();
    expect(MAP_CANVAS_FLOW_PROPS.disableKeyboardA11y).toBe(true);
    expect(MAP_CANVAS_FLOW_PROPS.panOnDrag).toBe(true);
    expect(MAP_CANVAS_FLOW_PROPS.zoomOnScroll).toBe(true);
    expect(MAP_CANVAS_FLOW_PROPS.onlyRenderVisibleElements).toBe(true);
  });
});
