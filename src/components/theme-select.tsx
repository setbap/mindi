import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

import { useI18n } from "@/i18n/i18n-context";
import { cn } from "@/lib/utils";
import {
  APP_THEMES,
  applyTheme,
  readStoredThemeId,
  type ThemeId,
} from "@/theme/themes";

interface ThemeSelectProps {
  /** Compact dock control vs full-width mobile list row. */
  variant?: "dock" | "list";
}

export function ThemeSelect({ variant = "list" }: ThemeSelectProps) {
  const { t } = useI18n();
  const [themeId, setThemeId] = useState<ThemeId>(() => readStoredThemeId());

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  function onChange(next: ThemeId) {
    setThemeId(next);
    applyTheme(next);
  }

  if (variant === "dock") {
    return (
      <label className="flex min-w-0 flex-1 items-center">
        <span className="sr-only">{t("theme")}</span>
        <select
          aria-label={t("theme")}
          className="border-input bg-background text-muted-foreground h-8 w-full rounded-md border px-2 text-xs"
          value={themeId}
          onChange={(event) => onChange(event.target.value as ThemeId)}
          data-testid="theme-select"
        >
          {APP_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label
      className={cn(
        "hover:bg-accent/50 flex h-12 w-full cursor-pointer items-center gap-3 rounded-md px-1",
      )}
    >
      <Palette className="text-foreground size-5 shrink-0" />
      <span className="text-foreground shrink-0 text-base">{t("theme")}</span>
      <select
        aria-label={t("theme")}
        className="border-input bg-background text-foreground ms-auto h-9 min-w-0 flex-1 rounded-md border px-2 text-sm"
        value={themeId}
        onChange={(event) => onChange(event.target.value as ThemeId)}
        data-testid="theme-select"
      >
        {APP_THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </label>
  );
}
