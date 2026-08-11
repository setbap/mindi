import { ForestInvariantError } from "./forest";
import type { CatalogRecord, ColorSlot, MapRecord } from "./types";

export function setNodeColorSlot(
  map: MapRecord,
  nodeId: string,
  slot: ColorSlot,
): MapRecord {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new ForestInvariantError(`Node ${nodeId} is missing.`);
  }
  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: { ...node, colorSlot: slot },
    },
  };
}

export function paletteColor(
  palette: CatalogRecord["palette"],
  slot: ColorSlot,
): string {
  return palette[slot - 1];
}

/** Dark ink for light fills; light ink for dark fills (WCAG relative luminance). */
export const NODE_INK_DARK = "#1d2021";
export const NODE_INK_LIGHT = "#fbf1c7";

/** Minimum body-text contrast against a Node fill (WCAG AA). */
export const NODE_TEXT_CONTRAST_MIN = 4.5;

export interface NodeChrome {
  background: string;
  color: string;
  mutedColor: string;
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return null;
  }
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(channel).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

/** Relative luminance of a `#RRGGBB` color, or `null` when the hex is invalid. */
export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) {
    return null;
  }
  const [r, g, b] = rgb.map(channelToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors, or `null` when either is invalid. */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) {
    return null;
  }
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pick readable Node body ink for a Palette fill by maximizing contrast.
 * Invalid hex falls back to light ink (Gruvbox fg).
 */
export function contrastInk(backgroundHex: string): string {
  const dark = contrastRatio(backgroundHex, NODE_INK_DARK) ?? 0;
  const light = contrastRatio(backgroundHex, NODE_INK_LIGHT) ?? 0;
  if (dark === 0 && light === 0) {
    return NODE_INK_LIGHT;
  }
  return dark >= light ? NODE_INK_DARK : NODE_INK_LIGHT;
}

/**
 * Resolve a Node fill + ink pair that keeps Palette color and AA text contrast.
 * When the raw slot hex is too mid-tone, nudge it toward white/black until ink
 * reaches {@link NODE_TEXT_CONTRAST_MIN}.
 */
export function nodeChrome(accentHex: string): NodeChrome {
  const rgb = parseHexRgb(accentHex);
  if (!rgb) {
    return {
      background: accentHex,
      color: NODE_INK_LIGHT,
      mutedColor: `color-mix(in srgb, ${NODE_INK_LIGHT} 72%, transparent)`,
    };
  }

  const ink = contrastInk(accentHex);
  const toward: [number, number, number] =
    ink === NODE_INK_DARK ? [255, 255, 255] : [0, 0, 0];

  let background = accentHex;
  let amount = 0;
  while (
    (contrastRatio(background, ink) ?? 0) < NODE_TEXT_CONTRAST_MIN &&
    amount < 0.72
  ) {
    amount += 0.04;
    background = toHex(mixRgb(rgb, toward, amount));
  }

  return {
    background,
    color: ink,
    mutedColor: `color-mix(in srgb, ${ink} 72%, ${background})`,
  };
}

export function updatePaletteSlot(
  catalog: CatalogRecord,
  slot: ColorSlot,
  hex: string,
): CatalogRecord {
  const palette = [...catalog.palette] as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  palette[slot - 1] = hex;
  return { ...catalog, palette };
}
