
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { slugifyTitle } from "./slug";
import { fetchSongById } from "../../services/songs";
import { createSong, updateSong, type SongWriteInput } from "../../services/songs.mutate";
import type { SongSection, SongSectionKind } from "../../types";
import { useSongCategories } from "../../hooks/useSongCategories";

import { useAutoFitContentFont } from "@/lib/hooks/useAutoFitContentFont";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToHorizontalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  songId?: string;
  onSaved: () => void;
};

function makeSection(kind: SongSectionKind = "verse"): SongSection {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, kind, label: kind === "chorus" ? "Refren" : "Zwrotka", body: "" };
}

const KIND_LABEL: Record<SongSectionKind, string> = {
  verse: "Zwrotka",
  chorus: "Refren",
  bridge: "Bridge",
  intro: "Intro",
  outro: "Outro",
  other: "Inne",
};

function stripChordProChords(text: string) {
  // removes [C], [G/B], [Am7] etc
  return (text ?? "").replace(/\[[^\]]+\]/g, "");
}

function MiniPresentationPreview(props: {
  title: string;
  sectionLabel: string;
  index: number;
  total: number;
  body: string;
}) {
  const { title, sectionLabel, index, total, body } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const lines = useMemo(() => {
    const raw = (body ?? "").replace(/\r\n/g, "\n");
    const arr = raw.split("\n");
    return arr.length ? arr : [""];
  }, [body]);

  const fontPx = useAutoFitContentFont({
    enabled: true,
    container: containerRef,
    measure: measureRef,
    min: 18,
    max: 120,
    safetyPx: 22,
    deps: [body],
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Podgląd prezentacji</CardTitle>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{title || "Utwór"}</span>{" "}
          • {index + 1}/{total} • {sectionLabel}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={containerRef}
          className={cn(
            "relative rounded-xl border bg-muted/10 p-5",
            "h-[260px] sm:h-[320px]",
            "overflow-hidden"
          )}
        >
          <div className="flex h-full items-center justify-center">
            <div
              ref={measureRef}
              className="inline-block text-left font-semibold tracking-wide"
              style={{ fontSize: `${fontPx}px` }}
            >
              {lines.map((ln, i) => (
                <div key={i} className="whitespace-pre">
                  {ln || "\u00A0"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          To jest “mini” podgląd — w prawdziwym trybie prezentacji dojdą strzałki,
          fullscreen itd.
        </div>
      </CardContent>
    </Card>
  );
}

function SortableSectionCard(props: {
  section: SongSection;
  idx: number;
  total: number;
  isPreview: boolean;

  onPreview: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<SongSection>) => void;
}) {
  const { section: s, idx, total, isPreview, onPreview, onMoveLeft, onMoveRight, onRemove, onPatch } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("shrink-0", isDragging && "opacity-80")}>
      <div className={cn("rounded-xl border bg-background p-3 w-[320px] sm:w-[360px] lg:w-[420px]", isPreview && "ring-2 ring-primary/40")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* DRAG HANDLE */}
            <button
              type="button"
              className={cn(
                "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background",
                "cursor-grab active:cursor-grabbing touch-none"
              )}
              title="Przeciągnij, aby zmienić kolejność"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 opacity-70" />
            </button>

            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                Karta {idx + 1}/{total}
              </div>
              <div className="text-sm font-medium">{(s.label ?? "").trim() || KIND_LABEL[s.kind]}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant={isPreview ? "default" : "outline"} onClick={onPreview}>
              Podgląd
            </Button>

            <Button type="button" size="icon" variant="outline" onClick={onMoveLeft} disabled={idx === 0} title="Przesuń w lewo">
              ←
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onMoveRight}
              disabled={idx === total - 1}
              title="Przesuń w prawo"
            >
              →
            </Button>

            <Button type="button" size="sm" variant="destructive" onClick={onRemove} disabled={total === 1}>
              Usuń
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Nazwa sekcji</div>
              <Input
                value={s.label}
                onChange={(e) => onPatch({ label: e.target.value })}
                placeholder="Np. Zwrotka 1"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Typ</div>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={s.kind}
                onChange={(e) => onPatch({ kind: e.target.value as any })}
              >
                {Object.entries(KIND_LABEL).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Treść (plain lub chordpro)</div>
            <Textarea
              value={s.body}
              onChange={(e) => onPatch({ body: e.target.value })}
              className="min-h-[120px] sm:min-h-[160px] font-mono"
              placeholder={`Np.\nTy wyzwoliłeś nas Panie...\n\nalbo chordpro:\n[C]Abba Ojcze, [G]Abba Ojcze`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SongFormDialog({ open, onOpenChange, mode, songId, onSaved }: Props) {
  const isEdit = mode === "edit";
  const { items: categoryItems, labelFor } = useSongCategories();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<"plain" | "chordpro">("plain");
  const [hasChords, setHasChords] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [sections, setSections] = useState<SongSection[]>([makeSection("verse")]);

  // preview
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<"lyrics" | "raw">("lyrics");

  const canEditId = !isEdit;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const selectedLabels = useMemo(() => cats.map((c) => labelFor(c)), [cats, labelFor]);

  useEffect(() => {
    if (!open) return;
    setErr(null);

    if (!isEdit) {
      setId("");
      setTitle("");
      setFormat("plain");
      setHasChords(false);
      setCats([]);
      setSections([makeSection("verse")]);
      setPreviewIndex(0);
      setPreviewMode("lyrics");
      return;
    }

    if (!songId) return;

    setLoading(true);
    fetchSongById(songId)
      .then((data) => {
        if (!data) {
          setErr("Nie znaleziono utworu.");
          return;
        }
        setId(data.id);
        setTitle(data.title);
        setFormat((data.format ?? "plain") as any);
        setHasChords(Boolean(data.hasChords));
        setCats(Array.isArray(data.categories) ? data.categories : []);
        const sec = Array.isArray(data.sections) && data.sections.length ? data.sections : [makeSection("verse")];
        setSections(sec);
        setPreviewIndex(0);
        setPreviewMode("lyrics");
      })
      .catch((e: any) => setErr(e?.message ?? "Błąd ładowania"))
      .finally(() => setLoading(false));
  }, [open, isEdit, songId]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) return;
    if (!id && title) setId(slugifyTitle(title));
  }, [open, isEdit, title, id]);

  useEffect(() => {
    setPreviewIndex((i) => Math.max(0, Math.min(i, sections.length - 1)));
  }, [sections.length]);

  const toggleCat = (slug: string) => {
    setCats((prev) => (prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug]));
  };

  const moveSection = (from: number, to: number) => {
    setSections((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  const updateSection = (idx: number, patch: Partial<SongSection>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSection = (kind: SongSectionKind) => setSections((prev) => [...prev, makeSection(kind)]);

  const removeSection = (idx: number) => setSections((prev) => prev.filter((_, i) => i !== idx));

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = e.active?.id;
    const overId = e.over?.id;
    if (!activeId || !overId || activeId === overId) return;

    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === activeId);
      const newIndex = prev.findIndex((s) => s.id === overId);
      if (oldIndex < 0 || newIndex < 0) return prev;

      const previewId = prev[previewIndex]?.id;
      const next = arrayMove(prev, oldIndex, newIndex);

      if (previewId) {
        const nextPreviewIndex = next.findIndex((s) => s.id === previewId);
        if (nextPreviewIndex >= 0) setPreviewIndex(nextPreviewIndex);
      }

      return next;
    });
  };

  const save = async () => {
    setErr(null);

    const cleanId = id.trim();
    if (!cleanId) return setErr("Ustaw ID (slug).");
    if (!title.trim()) return setErr("Tytuł jest wymagany.");
    if (!sections.length) return setErr("Dodaj przynajmniej jedną sekcję.");

    const payload: SongWriteInput = {
      id: cleanId,
      title: title.trim(),
      categories: cats,
      format,
      hasChords,
      sections: sections.map((s) => ({
        id: s.id,
        label: (s.label ?? "").trim() || KIND_LABEL[s.kind],
        kind: s.kind,
        body: s.body ?? "",
      })),
    };

    setLoading(true);
    try {
      if (isEdit) await updateSong(payload);
      else await createSong(payload);

      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  };

  const previewSection = sections[previewIndex] ?? sections[0];
  const previewLabel =
    (previewSection?.label ?? "").trim() || (previewSection ? KIND_LABEL[previewSection.kind] : "Sekcja");

  const previewBody = useMemo(() => {
    const raw = previewSection?.body ?? "";
    if (format !== "chordpro") return raw;
    if (previewMode === "raw") return raw;
    return stripChordProChords(raw);
  }, [previewSection?.body, format, previewMode]);

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 max-w-none overflow-hidden",
          "inset-0 w-screen h-[100dvh] rounded-none translate-x-0 translate-y-0",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-[90vw] sm:h-[90dvh] sm:max-w-8xl sm:rounded-lg"

        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b bg-background/95 backdrop-blur">
            <div className="p-4">
              <DialogHeader className="space-y-1">
                <DialogTitle>{isEdit ? "Edytuj utwór" : "Dodaj utwór"}</DialogTitle>
                <div className="text-xs text-muted-foreground">
                  Sekcje: przeciągnij za uchwyt (⠿) aby zmienić kolejność. Lista jest pozioma (scroll w bok).
                </div>
              </DialogHeader>
              {err ? <div className="mt-2 text-sm text-destructive">{err}</div> : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <div className="min-w-0 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Tytuł</div>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Abba Ojcze" />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">ID (slug)</div>
                      <Input value={id} disabled={!canEditId} onChange={(e) => setId(e.target.value)} placeholder="abba-ojcze" />
                      <div className="text-xs text-muted-foreground">
                        {canEditId ? "Generuje się z tytułu (możesz zmienić)." : "ID niezmienne (identyfikator dokumentu)."}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Format</div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={format === "plain" ? "default" : "outline"} onClick={() => setFormat("plain")}>
                          plain
                        </Button>
                        <Button type="button" variant={format === "chordpro" ? "default" : "outline"} onClick={() => setFormat("chordpro")}>
                          chordpro
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        chordpro = akordy w nawiasach kwadratowych, np. [C]Abba [G]Ojcze
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Opcje</div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={hasChords} onCheckedChange={(v) => setHasChords(Boolean(v))} />
                        Ma akordy
                      </label>

                      <div className="mt-2 text-xs text-muted-foreground">Wybrane kategorie:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedLabels.length ? (
                          selectedLabels.map((l) => (
                            <Badge key={l} variant="secondary">
                              {l}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">(brak)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Kategorie</div>
                    {categoryItems.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        Brak kategorii. Dodaj je w <b>/admin/categories</b>.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {categoryItems.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={cats.includes(c.id)} onCheckedChange={() => toggleCat(c.id)} />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">Sekcje (karty)</div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => addSection("verse")}>
                          + Zwrotka
                        </Button>
                        <Button type="button" variant="outline" onClick={() => addSection("chorus")}>
                          + Refren
                        </Button>
                        <Button type="button" variant="outline" onClick={() => addSection("other")}>
                          + Inne
                        </Button>
                      </div>
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={onDragEnd}
                      modifiers={[restrictToHorizontalAxis]}
                    >
                      <SortableContext items={sectionIds} strategy={horizontalListSortingStrategy}>
                        <div className={cn("flex gap-3 overflow-x-auto rounded-xl border bg-muted/10 p-3", "snap-x snap-mandatory, touch-pan-x, overflow-x-auto")}>
                          {sections.map((s, idx) => (
                            <div key={s.id} className="snap-start">
                              <SortableSectionCard
                                section={s}
                                idx={idx}
                                total={sections.length}
                                isPreview={previewIndex === idx}
                                onPreview={() => setPreviewIndex(idx)}
                                onMoveLeft={() => moveSection(idx, idx - 1)}
                                onMoveRight={() => moveSection(idx, idx + 1)}
                                onRemove={() => removeSection(idx)}
                                onPatch={(patch) => updateSection(idx, patch)}
                              />
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <div className="text-xs text-muted-foreground">
                      Tip: na touch (telefon) łap za uchwyt ⠿, żeby nie “walczyć” ze scrollowaniem w bok.
                    </div>
                  </div>

                  <div className="lg:hidden">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">Podgląd</div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))} disabled={previewIndex <= 0}>
                          ←
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewIndex((i) => Math.min(sections.length - 1, i + 1))}
                          disabled={previewIndex >= sections.length - 1}
                        >
                          →
                        </Button>
                      </div>
                    </div>

                    {format === "chordpro" ? (
                      <div className="mb-3 flex gap-2">
                        <Button type="button" size="sm" variant={previewMode === "lyrics" ? "default" : "outline"} onClick={() => setPreviewMode("lyrics")}>
                          Tekst
                        </Button>
                        <Button type="button" size="sm" variant={previewMode === "raw" ? "default" : "outline"} onClick={() => setPreviewMode("raw")}>
                          Tekst+Akordy
                        </Button>
                      </div>
                    ) : null}

                    <MiniPresentationPreview title={title} sectionLabel={previewLabel} index={previewIndex} total={Math.max(1, sections.length)} body={previewBody} />
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="sticky top-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">Podgląd</div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))} disabled={previewIndex <= 0}>
                          ←
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewIndex((i) => Math.min(sections.length - 1, i + 1))}
                          disabled={previewIndex >= sections.length - 1}
                        >
                          →
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground">Sekcja</div>
                      <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={previewIndex} onChange={(e) => setPreviewIndex(Number(e.target.value))}>
                        {sections.map((s, i) => (
                          <option key={s.id} value={i}>
                            {i + 1}. {(s.label ?? "").trim() || KIND_LABEL[s.kind]}
                          </option>
                        ))}
                      </select>

                      {format === "chordpro" ? (
                        <div className="mt-3 flex gap-2">
                          <Button type="button" size="sm" variant={previewMode === "lyrics" ? "default" : "outline"} onClick={() => setPreviewMode("lyrics")}>
                            Tekst
                          </Button>
                          <Button type="button" size="sm" variant={previewMode === "raw" ? "default" : "outline"} onClick={() => setPreviewMode("raw")}>
                            Tekst+Akordy
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <MiniPresentationPreview title={title} sectionLabel={previewLabel} index={previewIndex} total={Math.max(1, sections.length)} body={previewBody} />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[calc(env(safe-area-inset-bottom)+12px)]" />
          </div>

          <div className="shrink-0 border-t bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-2 p-4">
              <div className="text-xs text-muted-foreground">{loading ? "Zapisywanie…" : " "}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Anuluj
                </Button>
                <Button disabled={loading} onClick={save}>
                  {loading ? "Zapisywanie…" : "Zapisz"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
