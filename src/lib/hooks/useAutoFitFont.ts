"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";

type Size = { w: number; h: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function useAutoFitFont(opts: {
  enabled: boolean;
  container: React.RefObject<HTMLElement | null>;
  measure: React.RefObject<HTMLElement | null>;
  text: string;
  min?: number;
  max?: number;
  deps?: any[];
}) {
  const { enabled, container, measure, text } = opts;
  const min = opts.min ?? 18;
  const max = opts.max ?? 120;
  const deps = opts.deps ?? [];

  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  const [fontPx, setFontPx] = useState<number>(min);

  // Track container size (ResizeObserver)
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

  const safeText = useMemo(() => (text && text.trim().length ? text : " "), [text]);

  // Binary search best font that fits
  useLayoutEffect(() => {
    if (!enabled) return;

    const box = container.current;
    const meas = measure.current;
    if (!box || !meas) return;

    const W = box.clientWidth;
    const H = box.clientHeight;
    if (!W || !H) return;

    meas.textContent = safeText;

    const fits = (px: number) => {
      (meas as HTMLElement).style.fontSize = `${px}px`;
      const sh = (meas as HTMLElement).scrollHeight;
      const sw = (meas as HTMLElement).scrollWidth;
      return sh <= H && sw <= W;
    };

    let lo = clamp(min, 8, 240);
    let hi = clamp(max, lo, 240);

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
  }, [enabled, safeText, size.w, size.h, min, max, ...deps]);

  return fontPx;
}
