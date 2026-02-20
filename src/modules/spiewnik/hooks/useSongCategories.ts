"use client";

import { useEffect, useMemo, useState } from "react";
import type { SongCategory } from "../types";
import { fetchSongCategories } from "../services/categories";

export function useSongCategories() {
  const [items, setItems] = useState<SongCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetchSongCategories();
      setItems(res);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSongCategories();
        if (!alive) return;
        setItems(res);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [items]);

  const labelFor = (id: string) => map.get(id) ?? id;

  return { items, loading, labelFor, reload };
}
