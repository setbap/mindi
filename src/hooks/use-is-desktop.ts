import { useEffect, useState } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";

export function useIsDesktop(query = DESKTOP_QUERY): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return true;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }
    const media = window.matchMedia(query);
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return isDesktop;
}
