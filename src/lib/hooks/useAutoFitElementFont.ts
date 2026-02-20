"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type Size = { w: number; h: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Auto-fits font-size for an ELEMENT (not plain text).
 * - `container` defines available space.
 * - `measure` should contain the same markup as the visible content.
 * The hook binary-searches the largest font size that fits.
 */
export function useAutoFitElementFont(opts: {
  enabled: boolean;
  container: React.RefObject<HTMLElement | null>;
  measure: React.RefObject<HTMLElement | null>;
  min?: number;
  max?: number;
  safetyPx?: number; // extra margin to avoid edge clipping
  deps?: any[];
}) {
  const { enabled, container, measure } = opts;
  const min = opts.min ?? 22;
  const max = opts.max ?? 200;
  const safetyPx = opts.safetyPx ?? 6;
  const deps = opts.deps ?? [];

  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [fontPx, setFontPx] = useState(min);

  useEffect(() => {
    if (!enabled) return;
    const el = container.current;
    if (!el) return;

    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [enabled, container]);

  useLayoutEffect(() => {
    if (!enabled) return;

    const box = container.current;
    const meas = measure.current;
    if (!box || !meas) return;

    const W = box.clientWidth - safetyPx;
    const H = box.clientHeight - safetyPx;
    if (W <= 0 || H <= 0) return;

    const fits = (px: number) => {
      (meas as HTMLElement).style.fontSize = `${px}px`;
      const sh = (meas as HTMLElement).scrollHeight;
      const sw = (meas as HTMLElement).scrollWidth;
      return sh <= H && sw <= W;
    };

    let lo = clamp(min, 8, 260);
    let hi = clamp(max, lo, 260);

    if (!fits(lo)) {
      setFontPx(lo);
      return;
    }
    if (fits(hi)) {
      setFontPx(hi);
      return;
    }

    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) lo = mid;
      else hi = mid;
    }

    setFontPx(lo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, size.w, size.h, min, max, safetyPx, ...deps]);

  return fontPx;
}
