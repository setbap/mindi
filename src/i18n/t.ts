import type { Language } from "@/domain/types";
import { messageTable, type MessageKey } from "./messages";

export type MessageParams = Record<string, string | number>;

/**
 * Translate a chrome string for the active Language.
 * Missing Persian entries fall back to English.
 */
export function t(
  language: Language,
  key: MessageKey,
  params?: MessageParams,
): string {
  const table = messageTable(language);
  const english = messageTable("en");
  const template = table[key] ?? english[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] === undefined ? `{${name}}` : String(params[name]),
  );
}
