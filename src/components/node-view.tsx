import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { SafeMarkdown } from "@/components/safe-markdown";
import { normalizeClipboardPlainText } from "@/domain/clipboard";
import type { InteractionMode } from "@/domain/interaction";
import { nodeLabel } from "@/domain/node-browser";
import {
  clampNodeWidth,
  MAX_NODE_WIDTH,
  MIN_NODE_WIDTH,
} from "@/domain/resize";
import type { NodeRecord } from "@/domain/types";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";

interface NodeViewProps {
  node: NodeRecord;
  mode: InteractionMode;
  accentColor: string;
  onFocus: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onCommitWidth: (width: number) => void;
  onPreviewWidth?: (width: number | null) => void;
}

export function NodeView({
  node,
  mode,
  accentColor,
  onFocus,
  onStartEditing,
  onDraftChange,
  onCommit,
  onCancel,
  onCommitWidth,
  onPreviewWidth,
}: NodeViewProps) {
  const { t } = useI18n();
  const isFocused = mode.focusedId === node.id;
  const isEditing = mode.kind === "editing" && mode.focusedId === node.id;
  const isDesktop = useIsDesktop();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
  }, [isEditing]);

  useEffect(() => {
    setPreviewWidth(null);
    onPreviewWidth?.(null);
  }, [node.width, onPreviewWidth]);

  const label =
    node.markdown.trim().length === 0 ? t("emptyNode") : nodeLabel(node.markdown);

  function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      onCommit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
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

  function onEditorPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    event.stopPropagation();
    const raw = event.clipboardData.getData("text/plain");
    const inserted = normalizeClipboardPlainText(raw);
    const el = event.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${el.value.slice(0, start)}${inserted}${el.value.slice(end)}`;
    onDraftChange(next);
    const caret = start + inserted.length;
    requestAnimationFrame(() => {
      el.selectionStart = caret;
      el.selectionEnd = caret;
    });
  }

  function onResizePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onFocus(node.id);
    dragRef.current = { startX: event.clientX, startWidth: node.width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onResizePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) {
      return;
    }
    const delta = event.clientX - dragRef.current.startX;
    const next = clampNodeWidth(dragRef.current.startWidth + delta);
    setPreviewWidth(next);
    onPreviewWidth?.(next);
  }

  function onResizePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) {
      return;
    }
    const delta = event.clientX - dragRef.current.startX;
    const nextWidth = clampNodeWidth(dragRef.current.startWidth + delta);
    dragRef.current = null;
    setPreviewWidth(null);
    onPreviewWidth?.(null);
    if (nextWidth !== node.width) {
      onCommitWidth(nextWidth);
    }
  }

  return (
    <div
      id={`node-${node.id}`}
      aria-label={label}
      data-testid={`node-${node.id}`}
      className={cn(
        "bg-card text-card-foreground nodrag nopan relative rounded-md border p-3 outline-none",
        isFocused && "ring-ring border-ring ring-2",
      )}
      style={{
        width: "100%",
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onFocus(node.id);
      }}
    >
      {isEditing ? (
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("editNodeMarkdown")}</span>
          <textarea
            ref={textareaRef}
            aria-label={t("nodeMarkdown")}
            className="border-input bg-background focus-visible:ring-ring nodrag nopan nowheel min-h-24 w-full rounded-md border p-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
            value={mode.draft}
            dir="auto"
            onChange={(event) => onDraftChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onEditorKeyDown}
            onPaste={onEditorPaste}
          />
        </label>
      ) : (
        <div
          className={cn(
            "min-h-6 text-sm",
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
          {node.markdown === "" ? (
            t("startTyping")
          ) : (
            <SafeMarkdown
              markdown={node.markdown}
              className="[&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1"
            />
          )}
        </div>
      )}

      {isDesktop && isFocused && !isEditing ? (
        <button
          type="button"
          aria-label={t("resizeNode")}
          data-testid={`resize-handle-${node.id}`}
          className="nopan nodrag absolute top-0 right-0 h-full w-2 cursor-ew-resize rounded-r-md bg-transparent hover:bg-black/10"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}

      {previewWidth !== null ? (
        <span className="text-muted-foreground absolute -bottom-5 right-0 text-xs">
          {previewWidth}px ({MIN_NODE_WIDTH}–{MAX_NODE_WIDTH})
        </span>
      ) : null}
    </div>
  );
}
