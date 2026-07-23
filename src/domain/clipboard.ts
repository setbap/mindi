/**
 * Normalize pasted plain text for the Editing clipboard.
 * Only line endings are canonicalized; whitespace is otherwise preserved.
 */
export function normalizeClipboardPlainText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
