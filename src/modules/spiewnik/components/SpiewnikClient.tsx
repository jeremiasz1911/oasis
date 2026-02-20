"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Music2,
  Tag,
  X,
  Filter,
  Layers,
  CheckCircle2,
  Circle,
} from "lucide-react";

import { fetchSongs } from "../services/songs";
import { useSongCategories } from "../hooks/useSongCategories";
import type { Song } from "../types";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MatchMode = "or" | "and";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

function norm(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCats(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildQuery(q: string, cats: string[], match: MatchMode, uncat: boolean) {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (cats.length) p.set("cats", cats.join(","));
  if (match === "and") p.set("match", "and");
  if (uncat) p.set("uncat", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function SpiewnikClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const { items: categories, loading: catsLoading, labelFor } = useSongCategories();

  // URL -> state
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [cats, setCats] = useState<string[]>(parseCats(params.get("cats")));
  const [match, setMatch] = useState<MatchMode>(params.get("match") === "and" ? "and" : "or");
  const [uncat, setUncat] = useState(params.get("uncat") === "1");

  // state -> URL
  useEffect(() => {
    router.replace(`${pathname}${buildQuery(query, cats, match, uncat)}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cats, match, uncat]);

  // Back/forward sync
  useEffect(() => {
    setQuery(params.get("q") ?? "");
    setCats(parseCats(params.get("cats")));
    setMatch(params.get("match") === "and" ? "and" : "or");
    setUncat(params.get("uncat") === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.toString()]);

  const qDeb = useDebounced(query, 200);

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Pobieramy raz (bez filtrów) – najpewniejsze.
  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchSongs({ take: 1000 } as any)
      .then((res) => {
        if (!alive) return;
        setAllSongs(res ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setAllSongs([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const categoryIdSet = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  // liczniki dla sidebaru liczymy na pełnej bazie (ładny flow)
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    let un = 0;
    for (const s of allSongs) {
      const cs = s.categories ?? [];
      if (!cs.length) un++;
      for (const c of cs) m.set(c, (m.get(c) ?? 0) + 1);
    }
    m.set("__uncat__", un);
    return m;
  }, [allSongs]);

  const selectedBadges = useMemo(
    () => (uncat ? [] : cats.map((c) => ({ id: c, label: labelFor(c) }))),
    [cats, labelFor, uncat]
  );

  // ✅ 100% pewne filtrowanie po stronie klienta
  const filteredSongs = useMemo(() => {
    const nq = norm(qDeb);
    const selected = cats.filter(Boolean);

    let list = allSongs;

    // bez kategorii
    if (uncat) {
      list = list.filter((s) => !(s.categories?.length));
    } else if (selected.length) {
      if (match === "and") {
        list = list.filter((s) => selected.every((c) => (s.categories ?? []).includes(c)));
      } else {
        list = list.filter((s) => selected.some((c) => (s.categories ?? []).includes(c)));
      }
    }

    // wyszukiwanie contains (tytuł + id)
    if (nq) {
      list = list.filter((s) => {
        const t = norm(s.title);
        const id = norm(s.id);
        return t.includes(nq) || id.includes(nq);
      });
    }

    // sort
    return [...list].sort((a, b) => (a.title ?? a.title).localeCompare(b.title ?? b.title, "pl"));
  }, [allSongs, qDeb, cats, match, uncat]);

  const toggleCat = (id: string) => {
    setUncat(false);
    setCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clearFilters = () => {
    setCats([]);
    setUncat(false);
    setQuery("");
    setMatch("or");
  };

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
      {/* SIDEBAR */}
      <aside className="md:sticky md:top-6">
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Filtry</div>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" onClick={clearFilters} disabled={!cats.length && !uncat && !query}>
                  <X className="mr-2 h-4 w-4" />
                  Wyczyść
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={match === "or" ? "default" : "outline"}
                onClick={() => setMatch("or")}
                className="justify-center"
                title="Utwór pasuje, gdy ma którąkolwiek kategorię"
              >
                lub
              </Button>
              <Button
                type="button"
                variant={match === "and" ? "default" : "outline"}
                onClick={() => setMatch("and")}
                className="justify-center"
                title="Utwór pasuje, gdy ma wszystkie kategorie"
              >
                również
              </Button>
            </div>

            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                uncat ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted/40"
              )}
              onClick={() => {
                setUncat((v) => !v);
                setCats([]);
              }}
            >
              <span className="flex items-center gap-2">
                {uncat ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                Bez kategorii
              </span>
              <span className={cn("text-xs", uncat ? "opacity-90" : "text-muted-foreground")}>
                {counts.get("__uncat__") ?? 0}
              </span>
            </button>

            <div className="h-px bg-border" />

            <div className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Kategorie
            </div>

            <div className="max-h-[55vh] overflow-auto pr-1">
              {catsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : categories.length ? (
                <div className="space-y-2">
                  {categories.map((c) => {
                    const checked = cats.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCat(c.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-all",
                          checked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted/40"
                        )}
                      >
                        <span className="truncate flex items-center gap-2">
                          {checked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                          {c.name}
                        </span>
                        <span className={cn("ml-2 text-xs", checked ? "opacity-90" : "text-muted-foreground")}>
                          {counts.get(c.id) ?? 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Brak kategorii. Dodaj je w <span className="font-medium">/admin/categories</span>.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* MAIN */}
      <main className="space-y-4">
        {/* SEARCH */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Szukaj po tytule…"
                  className="h-12 pl-9 text-base"
                />
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{match.toUpperCase()}</span>
              </div>
            </div>

            {/* chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {uncat ? <Badge variant="secondary">Bez kategorii</Badge> : null}
              {!uncat && cats.length ? <Badge variant="outline">{match.toUpperCase()}</Badge> : null}

              <AnimatePresence initial={false}>
                {!uncat &&
                  selectedBadges.map((b) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    >
                      <Badge className="gap-2" variant="secondary">
                        {b.label}
                        <button
                          onClick={() => setCats((prev) => prev.filter((x) => x !== b.id))}
                          className="ml-1 rounded hover:opacity-80"
                          aria-label="Usuń kategorię"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
              </AnimatePresence>

              {(!uncat && cats.length) || query ? (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="ml-auto">
                  <X className="mr-2 h-4 w-4" />
                  Wyczyść
                </Button>
              ) : null}
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Wyniki: <span className="font-medium text-foreground">{loading ? "…" : filteredSongs.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* LIST */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Music2 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Utwory</div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <div className="h-px bg-border" />
                  </div>
                ))}
              </div>
            ) : filteredSongs.length ? (
              <motion.div layout className="divide-y">
                <AnimatePresence initial={false}>
                  {filteredSongs.map((s) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Link
                        href={`/spiewnik/${s.id}`}
                        className="block rounded-md py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3 px-2">
                          <div className="min-w-0">
                            <div className="truncate text-base font-medium">{s.title}</div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {(s.categories ?? []).slice(0, 4).map((cid) => (
                                <Badge key={cid} variant={categoryIdSet.has(cid) ? "secondary" : "outline"}>
                                  {labelFor(cid)}
                                </Badge>
                              ))}
                              {(s.categories?.length ?? 0) > 4 ? (
                                <Badge variant="outline">+{(s.categories?.length ?? 0) - 4}</Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 text-xs text-muted-foreground">
                            {s.hasChords ? "🎼 akordy" : "📝 tekst"}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                Brak wyników. Zmień filtry lub wpisz inną frazę.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}