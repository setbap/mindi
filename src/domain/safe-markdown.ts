/**
 * URL policy for rendered Markdown links and images.
 * Only absolute http, https, and mailto are permitted (ADR 0004 / SPEC).
 */
export function safeMarkdownUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (
      protocol === "https:" ||
      protocol === "http:" ||
      protocol === "mailto:"
    ) {
      return trimmed;
    }
  } catch {
    return "";
  }

  return "";
}
