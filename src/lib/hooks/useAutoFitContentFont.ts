"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type Size = { w: number; h: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function getPadding(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const pl = parseFloat(cs.paddingLeft || "0") || 0;
  const pr = parseFloat(cs.paddingRight || "0") || 0;
  const pt = parseFloat(cs.paddingTop || "0") || 0;
  const pb = parseFloat(cs.paddingBottom || "0") || 0;
  return { pl, pr, pt, pb };
}

/**
 * Auto-fit font-size so that `measure` (content-sized element) fits inside `container` inner box.
 * - container may have padding; we subtract it.
 * - measure should be content-sized (e.g. inline-block), WITHOUT h-full / w-full.
 */
export function useAutoFitContentFont(opts: {
  enabled: boolean;
  container: React.RefObject<HTMLElement | null>;
  measure: React.RefObject<HTMLElement | null>;
  min?: number;
  max?: number;
  safetyPx?: number; // extra inner margin to avoid touching walls
  deps?: any[];
}) {
  const { enabled, container, measure } = opts;
  const min = opts.min ?? 18;
  const max = opts.max ?? 240;
  const safetyPx = opts.safetyPx ?? 14;
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

    const { pl, pr, pt, pb } = getPadding(box);

    const W = box.clientWidth - pl - pr - safetyPx;
    const H = box.clientHeight - pt - pb - safetyPx;
    if (W <= 0 || H <= 0) return;

    const fits = (px: number) => {
      (meas as HTMLElement).style.fontSize = `${px}px`;
      const w = (meas as HTMLElement).offsetWidth;
      const h = (meas as HTMLElement).offsetHeight;
      return w <= W && h <= H;
    };

    let lo = clamp(min, 8, 360);
    let hi = clamp(max, lo, 360);

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
