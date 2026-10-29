"use client";

import { useEffect, useState } from "react";

// how many fixed-size items fit on one line of a flex row, kept in step as the
// row resizes. if they don't all fit, one slot is left free for a "+N" button.
// the row needs a definite width (flex: 1 + min-width: 0 works). returns a
// setter to pass as the row's ref, and how many items to show
export function useFittingCount<T extends HTMLElement>(
  total: number,
  itemSizePx: number,
) {
  const [el, setEl] = useState<T | null>(null);
  const [slots, setSlots] = useState<number | null>(null);

  useEffect(() => {
    if (!el) return;

    const update = () => {
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const width = el.clientWidth;
      setSlots(Math.max(1, Math.floor((width + gap) / (itemSizePx + gap))));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, itemSizePx]);

  // before the first measure, show everything and let overflow clip it
  const visible =
    slots === null || total <= slots ? total : Math.max(0, slots - 1);

  return [setEl, visible] as const;
}
