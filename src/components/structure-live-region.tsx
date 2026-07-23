import { useEffect, useRef, useState } from "react";

import { isEditing, type InteractionMode } from "@/domain/interaction";
import type { MapRecord } from "@/domain/types";

interface StructureLiveRegionProps {
  map: MapRecord;
  mode: InteractionMode;
}

/** Polite live region for structural/mode results only. */
export function StructureLiveRegion({ map, mode }: StructureLiveRegionProps) {
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
          ? `Map now has ${count} nodes.`
          : `Deleted. Map now has ${count} nodes.`,
      );
    } else if (editing !== prevEditing.current) {
      setMessage(editing ? "Editing Node." : "Returned to Focused.");
    }

    prevCount.current = count;
    prevEditing.current = editing;
  }, [map, mode]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
