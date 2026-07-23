import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NodeView } from "@/components/node-view";
import type { InteractionMode } from "@/domain/interaction";
import type { NodeRecord } from "@/domain/types";

const node: NodeRecord = {
  id: "n1",
  markdown: "**Hello** and <b>raw</b>",
  width: 280,
  colorSlot: 1,
  parentId: null,
  childIds: [],
};

function focusedMode(): InteractionMode {
  return { kind: "focused", focusedId: "n1" };
}

function editingMode(draft: string): InteractionMode {
  return { kind: "editing", focusedId: "n1", draft };
}

describe("NodeView Markdown and clipboard", () => {
  it("renders safe Markdown while Focused", () => {
    render(
      <NodeView
        node={node}
        mode={focusedMode()}
        accentColor="#fabd2f"
        onFocus={vi.fn()}
        onStartEditing={vi.fn()}
        onDraftChange={vi.fn()}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
        onCommitWidth={vi.fn()}
      />,
    );

    expect(screen.getByTestId("safe-markdown")).toBeInTheDocument();
    expect(screen.getByText("Hello").tagName.toLowerCase()).toBe("strong");
    expect(document.querySelector("b")).toBeNull();
    expect(screen.getByText(/raw/)).toBeInTheDocument();
  });

  it("pastes normalized plain text and ignores rich clipboard HTML", () => {
    const onDraftChange = vi.fn();

    render(
      <NodeView
        node={node}
        mode={editingMode("before")}
        accentColor="#fabd2f"
        onFocus={vi.fn()}
        onStartEditing={vi.fn()}
        onDraftChange={onDraftChange}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
        onCommitWidth={vi.fn()}
      />,
    );

    const editor = screen.getByLabelText(
      "Node markdown",
    ) as HTMLTextAreaElement;
    editor.focus();
    editor.setSelectionRange(6, 6);

    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type: string) => {
          if (type === "text/plain") {
            return "line1\r\nline2\rline3";
          }
          if (type === "text/html") {
            return "<strong>evil</strong>";
          }
          return "";
        },
      },
    });

    expect(onDraftChange).toHaveBeenCalledWith("beforeline1\nline2\nline3");
    expect(onDraftChange).not.toHaveBeenCalledWith(
      expect.stringContaining("evil"),
    );
    expect(onDraftChange).not.toHaveBeenCalledWith(
      expect.stringContaining("<strong>"),
    );
  });
});
