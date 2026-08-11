export type ThemeId =
  | "cursor-dark"
  | "gruvbox"
  | "tokyo-night"
  | "catppuccin"
  | "nord"
  | "one-dark"
  | "github-dark"
  | "vercel"
  | "cloudflare";

export interface AppTheme {
  id: ThemeId;
  label: string;
  background: string;
}

export const DEFAULT_THEME_ID: ThemeId = "cursor-dark";

export const APP_THEMES: readonly AppTheme[] = [
  {
    id: "cursor-dark",
    label: "Cursor Dark",
    background: "#181818",
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    background: "#282828",
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    background: "#1a1b26",
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    background: "#1e1e2e",
  },
  {
    id: "nord",
    label: "Nord",
    background: "#2e3440",
  },
  {
    id: "one-dark",
    label: "One Dark",
    background: "#282c34",
  },
  {
    id: "github-dark",
    label: "GitHub Dark",
    background: "#0d1117",
  },
  {
    id: "vercel",
    label: "Vercel",
    background: "#000000",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    background: "#1d1f20",
  },
] as const;

export const THEME_STORAGE_KEY = "mindi.theme";

export function isThemeId(value: string): value is ThemeId {
  return APP_THEMES.some((theme) => theme.id === value);
}

export function themeById(id: ThemeId): AppTheme {
  return APP_THEMES.find((theme) => theme.id === id) ?? APP_THEMES[0]!;
}

/** Apply shell chrome colors used by Safari toolbar / status bar tinting. */
export function applyThemeChrome(background: string): void {
  const root = document.documentElement;
  const body = document.body;
  const meta = document.querySelector('meta[name="theme-color"]');
  const tint = document.querySelector<HTMLElement>(".safari-chrome-tint");

  root.style.backgroundColor = background;
  if (body) {
    body.style.backgroundColor = background;
  }
  meta?.setAttribute("content", background);
  if (tint) {
    tint.style.backgroundColor = background;
  }
}

export function applyTheme(id: ThemeId): void {
  const theme = themeById(id);
  const root = document.documentElement;

  if (id === DEFAULT_THEME_ID) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", id);
  }

  applyThemeChrome(theme.background);
  localStorage.setItem(THEME_STORAGE_KEY, id);
}

export function readStoredThemeId(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isThemeId(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access failures (private mode, etc.).
  }
  return DEFAULT_THEME_ID;
}
