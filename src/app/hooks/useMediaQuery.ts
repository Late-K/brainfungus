"use client";

import { useCallback, useSyncExternalStore } from "react";

// whether a css media query currently matches, kept in step as it changes.
// the server render assumes it doesn't match (mobile first)
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
