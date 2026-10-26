"use client";

import { useEffect, useState } from "react";

// keeps a --fit-height css variable on an element set to the room between its
// top edge and the bottom of the screen (minus a gap). for sticky elements the
// top is clamped to where it sticks, so it grows as content above scrolls away
// and then holds steady. pass the returned setter as the element's ref
export function useFitToViewport<T extends HTMLElement>(bottomGapPx = 24) {
  const [el, setEl] = useState<T | null>(null);

  useEffect(() => {
    if (!el) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      // "auto" when it isn't sticky, which parses to NaN
      const stickyTop = parseFloat(getComputedStyle(el).top) || 0;
      const top = Math.max(el.getBoundingClientRect().top, stickyTop);
      const height = Math.max(
        0,
        Math.floor(window.innerHeight - top - bottomGapPx),
      );
      el.style.setProperty("--fit-height", `${height}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [el, bottomGapPx]);

  return setEl;
}
