import { useEffect, useRef, useState } from "react";

import { isEditing, type InteractionMode } from "@/domain/interaction";
import type { MapRecord } from "@/domain/types";
import { useI18n } from "@/i18n/i18n-context";

interface StructureLiveRegionProps {
  map: MapRecord;
  mode: InteractionMode;
}

/** Polite live region for structural/mode results only. */
export function StructureLiveRegion({ map, mode }: StructureLiveRegionProps) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const prevCount = useRef(Object.keys(map.nodes).length);
  const prevEditing = useRef(isEditing(mode));

  useEffect(() => {
    const count = Object.keys(map.nodes).length;
    const editing = isEditing(mode);

    if (count !== prevCount.current) {
      const delta = count - prevCount.current;
      setMessage(
        delta > 0
          ? t("mapNowHasNodes", { count })
          : t("deletedMapNowHasNodes", { count }),
      );
    } else if (editing !== prevEditing.current) {
      setMessage(editing ? t("editingNode") : t("returnedToFocused"));
    }

    prevCount.current = count;
    prevEditing.current = editing;
  }, [map, mode, t]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
