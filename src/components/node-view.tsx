import { useEffect, useRef, type KeyboardEvent } from "react";

import type { InteractionMode } from "@/domain/interaction";
import type { NodeRecord } from "@/domain/types";
import { cn } from "@/lib/utils";

interface NodeViewProps {
  node: NodeRecord;
  depth: number;
  mode: InteractionMode;
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function NodeView({
  node,
  depth,
  mode,
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
}: NodeViewProps) {
  const isFocused = mode.focusedId === node.id;
  const isEditing = mode.kind === "editing" && mode.focusedId === node.id;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
  }, [isEditing]);

  const label = node.markdown.trim().length > 0 ? node.markdown : "Empty node";

  function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onCommit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const el = event.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
      onDraftChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = start + 2;
        el.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{ marginInlineStart: `${depth * 1.25}rem` }}
    >
      <div
        id={`node-${node.id}`}
        role="treeitem"
        aria-selected={isFocused}
        aria-label={label}
        data-testid={`node-${node.id}`}
        className={cn(
          "bg-card text-card-foreground rounded-md border p-3 outline-none",
          isFocused && "ring-ring border-ring ring-2",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onFocus(node.id);
        }}
      >
        {isEditing ? (
          <label className="flex flex-col gap-1">
            <span className="sr-only">Edit node markdown</span>
            <textarea
              ref={textareaRef}
              aria-label="Node markdown"
              className="border-input bg-background focus-visible:ring-ring min-h-24 w-full rounded-md border p-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
              value={mode.draft}
              dir="auto"
              onChange={(event) => onDraftChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={onEditorKeyDown}
            />
          </label>
        ) : (
          <p
            className={cn(
              "min-h-6 text-sm whitespace-pre-wrap",
              node.markdown === "" && "text-muted-foreground italic",
            )}
            dir="auto"
            onClick={(event) => {
              event.stopPropagation();
              if (isFocused) {
                onStartEditing(node.id);
                return;
              }
              onFocus(node.id);
            }}
          >
            {node.markdown === "" ? "Start typing…" : node.markdown}
          </p>
        )}
      </div>
    </div>
  );
}
