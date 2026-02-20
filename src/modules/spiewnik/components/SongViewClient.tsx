"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Moon,
  Sun,
  MonitorUp,
  MonitorOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Type,
  Eye,
  Music,
  X,
  AlignLeft,
  List,
  Paintbrush,
  ArrowUpDown,
} from "lucide-react";

import { fetchSongById } from "../services/songs";
import { renderChordPro } from "../chords/chordpro";
import { transposeChordPro } from "../chords/transpose";
import { useSongCategories } from "../hooks/useSongCategories";
import type { SongFull } from "../types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAutoFitContentFont } from "@/lib/hooks/useAutoFitContentFont";

type ViewMode = "lyrics" | "both" | "chords";
type ChordLayout = "inline" | "above";
type PresLine = { kind: "lyrics" | "chords" | "gap"; text: string };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function useLocalNumber(key: string, initial: number) {
  const [val, setVal] = useState(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const n = Number(raw);
        if (!Number.isNaN(n)) setVal(n);
      }
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
  }, [key, val]);

  return [val, setVal] as const;
}

function useLocalString(key: string, initial: string) {
  const [val, setVal] = useState(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setVal(raw);
    } catch {}
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, val);
    } catch {}
  }, [key, val]);

  return [val, setVal] as const;
}

function splitPreserveEmptyLines(s: string) {
  return s.replace(/\r\n/g, "\n").split("\n");
}

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.(`(max-width: ${breakpointPx}px)`);
    if (!mq) return;
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

/**
 * Na mobile: dzielimy każdą linijkę na ~2 części (bliżej środka),
 * żeby skrócić "najdłuższą" linię i pozwolić fontowi wzrosnąć.
 */
function splitLineNearMiddle(line: string): string[] {
  const t = (line ?? "").trimEnd();
  if (!t) return [""];

  if (t.length < 22) return [t];

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return [t];

  const total = words.join(" ").length;
  const target = total / 2;

  let bestIdx = -1;
  let bestDiff = Infinity;
  let acc = 0;

  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].length + (i === 0 ? 0 : 1);
    const diff = Math.abs(acc - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) return [t];

  const left = words.slice(0, bestIdx + 1).join(" ");
  const right = words.slice(bestIdx + 1).join(" ");

  if (left.length < 6 || right.length < 6) return [t];
  return [left, right];
}

function detectHasChordsFromSections(sections: { body?: string }[] | undefined | null) {
  if (!Array.isArray(sections)) return false;
  return sections.some((s) => /\[[^\]]+\]/.test(s.body ?? ""));
}

function parseChordProInlineLine(line: string) {
  // Returns segments: { chord?: string, text: string }
  // Example: "[D] Duchu [G] Święty" => chord D + " Duchu ", chord G + " Święty"
  const out: { chord?: string; text: string }[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line))) {
    const before = line.slice(last, m.index);
    const chord = (m[1] ?? "").trim();
    if (out.length === 0 && before.length) {
      // text before first chord
      out.push({ text: before });
    } else if (before.length) {
      // attach to previous segment text
      out.push({ text: before });
    }
    out.push({ chord, text: "" });
    last = m.index + m[0].length;
  }

  const tail = line.slice(last);
  if (tail.length) out.push({ text: tail });

  // Merge: chord segments should have following text
  const merged: { chord?: string; text: string }[] = [];
  let pendingChord: string | undefined;

  for (const seg of out) {
    if (seg.chord) {
      // if chord appears without text yet, stash
      pendingChord = seg.chord;
      // if there is some text in seg.text, handle below
      if (seg.text) {
        merged.push({ chord: pendingChord, text: seg.text });
        pendingChord = undefined;
      }
      continue;
    }

    if (pendingChord) {
      merged.push({ chord: pendingChord, text: seg.text });
      pendingChord = undefined;
    } else {
      merged.push({ text: seg.text });
    }
  }

  if (pendingChord) merged.push({ chord: pendingChord, text: "" });

  return merged;
}

export default function SongViewClient({ songId }: { songId: string }) {
  const { theme, setTheme } = useTheme();
  const { labelFor } = useSongCategories();
  const isMobile = useIsMobile(640);

  const [data, setData] = useState<SongFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [transpose, setTranspose] = useState(0);
  const [presentation, setPresentation] = useState(false);

  const [mode, setMode] = useState<ViewMode>("lyrics");
  const [chordLayout, setChordLayout] = useLocalString("spiewnik_chord_layout", "above");
  const [chordColor, setChordColor] = useLocalString("spiewnik_chord_color", "#2563eb");

  const [fontStep, setFontStep] = useLocalNumber("spiewnik_font_step", 0);
  const [sectionIndex, setSectionIndex] = useState(0);

  // Cały tekst (scroll)
  const [allText, setAllText] = useState(false);

  // Minimalny "X" w prezentacji – pokazuj po interakcji i chowaj
  const [exitVisible, setExitVisible] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const bumpExit = () => {
    setExitVisible(true);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => setExitVisible(false), 1600);
  };

  // Slide anim direction
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchSongById(songId)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setSectionIndex(0);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [songId]);

  const sections = data?.sections ?? [];
  const current = sections[sectionIndex];
  const nextLabel = sections[sectionIndex + 1]?.label ?? null;

  // NOTE: don't rely on `hasChords` flag (easy to forget in admin) — detect from bodies
  const detectedHasChords = useMemo(() => {
    if ((data?.format ?? "plain") !== "chordpro") return false;
    return Boolean(data?.hasChords) || detectHasChordsFromSections(data?.sections);
  }, [data]);

  const canChordModes = (data?.format ?? "plain") === "chordpro" && detectedHasChords;

  const effectiveMode: ViewMode = useMemo(() => {
    if ((data?.format ?? "plain") !== "chordpro") return "lyrics";
    if (!detectedHasChords) return "lyrics";
    return mode;
  }, [data, mode, detectedHasChords]);

  const sectionBody = useMemo(() => {
    const raw = current?.body ?? "";
    const fmt = data?.format ?? "plain";
    if (fmt === "chordpro" && transpose) return transposeChordPro(raw, transpose);
    return raw;
  }, [current, data, transpose]);

  const rendered = useMemo(() => {
    const fmt = data?.format ?? "plain";
    if (fmt !== "chordpro") return null;
    return renderChordPro(sectionBody);
  }, [data, sectionBody]);

  const fontPxLyrics = clamp(18 + fontStep * 2, 12, 44);
  const fontPxChords = clamp(12 + fontStep * 1, 10, 28);

  const toggleFullscreen = async (on: boolean) => {
    try {
      if (on) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {}
  };

  const togglePresentation = async () => {
    const next = !presentation;
    setPresentation(next);
    setExitVisible(false);
    await toggleFullscreen(next);
  };

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) {
        setPresentation(false);
        setExitVisible(false);
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const goPrev = () => {
    setSlideDir(-1);
    setSectionIndex((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setSlideDir(1);
    setSectionIndex((i) => Math.min(sections.length - 1, i + 1));
  };

  // swipe + klawisze w prezentacji
  useEffect(() => {
    if (!presentation) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        setExitVisible(false);
        setPresentation(false);
      }
    };

    let sx = 0;
    let sy = 0;
    let st = 0;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      st = Date.now();
      bumpExit();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = Date.now() - st;

      if (dt < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) goNext();
        else goPrev();
      }
    };

    const onMove = () => bumpExit();

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMove);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation, sections.length]);

  // Presentation lines: always "above" layout (chords line + lyrics line)
  const presLinesRaw: PresLine[] = useMemo(() => {
    if (!data || !current) return [];

    if (!rendered) {
      const rawLines = splitPreserveEmptyLines(sectionBody || "");
      return rawLines.map((t) => (t.length ? { kind: "lyrics", text: t } : { kind: "gap", text: "" }));
    }

    const out: PresLine[] = [];
    for (const ln of rendered) {
      if (ln.isDirective) continue;

      const chords = (ln.chords ?? "").trimEnd();
      const lyrics = (ln.lyrics ?? "").trimEnd();

      if (effectiveMode === "lyrics") {
        out.push(lyrics.length ? { kind: "lyrics", text: lyrics } : { kind: "gap", text: "" });
        continue;
      }
      if (effectiveMode === "chords") {
        out.push(chords.length ? { kind: "chords", text: chords } : { kind: "gap", text: "" });
        continue;
      }

      if (chords.length) out.push({ kind: "chords", text: chords });
      out.push(lyrics.length ? { kind: "lyrics", text: lyrics } : { kind: "gap", text: "" });
    }
    return out;
  }, [data, current, rendered, sectionBody, effectiveMode]);

  const presLines: PresLine[] = useMemo(() => {
    if (!isMobile) return presLinesRaw;

    const out: PresLine[] = [];
    for (const l of presLinesRaw) {
      if (l.kind !== "lyrics") {
        out.push(l);
        continue;
      }
      const parts = splitLineNearMiddle(l.text);
      for (const p of parts) out.push({ kind: "lyrics", text: p });
    }
    return out;
  }, [isMobile, presLinesRaw]);

  const chordScale = effectiveMode === "both" ? 0.58 : 1.0;

  // Auto-fit (presentation)
  const fitBoxRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const maxFit = useMemo(() => clamp(260 + fontStep * 18, 60, 420), [fontStep]);

  const fittedPx = useAutoFitContentFont({
    enabled: presentation,
    container: fitBoxRef,
    measure: measureRef,
    min: 18,
    max: maxFit,
    safetyPx: 18,
    deps: [songId, sectionIndex, effectiveMode, presLines.length, isMobile, chordColor],
  });

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const TransposeControls = canChordModes ? (
    <div className="flex flex-wrap items-center gap-2 justify-between w-full md:w-auto">
      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setTranspose((t) => Math.max(-12, t - 1))}>
        -1
      </Button>
      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setTranspose((t) => Math.min(12, t + 1))}>
        +1
      </Button>
      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setTranspose(0)} disabled={transpose === 0}>
        Reset
      </Button>
      <Badge variant="outline" className="ml-1">
        {transpose === 0 ? "Transpozycja: 0" : `Transpozycja: ${transpose > 0 ? "+" : ""}${transpose}`}
      </Badge>
    </div>
  ) : null;

  const AppearanceControls = canChordModes ? (
    <div className="flex flex-wrap items-center gap-2 justify-between w-full md:w-auto pb-4">
      <Button
        variant={chordLayout === "above" ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setChordLayout("above")}
        title="Akordy nad tekstem"
      >
        <ArrowUpDown className="h-4 w-4" />
      </Button>
      <Button
        variant={chordLayout === "inline" ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setChordLayout("inline")}
        title="Akordy w tekście"
      >
        <Music className="h-4 w-4" />
      </Button>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Paintbrush className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Kolor akordów</div>
        <Input
          type="color"
          value={chordColor}
          onChange={(e) => setChordColor(e.target.value)}
          className="h-10 w-12 p-1"
          title="Kolor akordów"
        />
      </div>
    </div>
  ) : null;

  const HeaderBlock = (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">
        {loading ? "Ładowanie…" : data?.title ?? "Nie znaleziono utworu"}
      </h1>
      {isMobile ? 
              <div className="inline-flex items-center justify-center w-full">
                <hr className="w-full h-px my-3 bg-gray-100/10 border-0"/>
                <span className="absolute left-7 opacity-50 font-light italic">tekst</span>
              </div> 
                : "" 
            /* separator on mobile */
            }
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <div className="flex flex-wrap items-center gap-2 justify-start w-full md:w-auto">
          <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setFontStep((v) => clamp(v - 1, -6, 10))}>
            A-
          </Button>
          <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setFontStep((v) => clamp(v + 1, -6, 10))}>
            A+
          </Button>
          <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={() => setFontStep(0)} disabled={fontStep === 0}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
            
        <div className="flex flex-wrap items-center gap-2">
          {isMobile ? 
            <div className="inline-flex items-center justify-center w-full">
              <hr className="w-full h-px my-3 bg-gray-100/10 border-0"/>
              <span className="absolute left-7 opacity-50 font-light italic">transpozycja</span>
            </div> 
              : "" 
          /* separator on mobile */
          }
          {effectiveMode === "both" || effectiveMode === "chords" ? TransposeControls : ""}
          {isMobile ? 
            <div className="inline-flex items-center justify-center w-full">
              <hr className="w-full h-px my-3 bg-gray-100/10 border-0"/>
              <span className="absolute left-7 opacity-50 font-light italic">akordy</span>
            </div> 
              : "" 
          /* separator on mobile */
          } 
          {effectiveMode === "both" || effectiveMode === "chords" ? AppearanceControls : ""}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{songId}</Badge>
        {Array.isArray(data?.categories)
          ? data!.categories.map((c) => (
              <Badge key={c} variant="secondary">
                {labelFor(c)}
              </Badge>
            ))
          : null}
        {(data?.format ?? "plain") === "chordpro" ? <Badge variant="outline">ChordPro</Badge> : null}
      </div>
    </div>
  );

  const SectionNav = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={goPrev} disabled={sectionIndex <= 0}>
        <ChevronLeft className="mr-2 h-4 w-4" /> Poprzednia
      </Button>
      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={goNext} disabled={sectionIndex >= sections.length - 1}>
        Następna <ChevronRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="mx-2 h-6 w-px bg-border" />

      <div className="text-sm text-muted-foreground">
        {sections.length ? (
          <>
            Sekcja: <span className="font-medium text-foreground">{current?.label ?? "—"}</span>{" "}
            <span className="ml-2">({sectionIndex + 1}/{sections.length})</span>
          </>
        ) : (
          "Sekcje: —"
        )}
      </div>

      {sections.length > 1 ? (
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm ml-auto"
          value={sectionIndex}
          onChange={(e) => setSectionIndex(Number(e.target.value))}
        >
          {sections.map((s, idx) => (
            <option key={s.id} value={idx}>
              {idx + 1}. {s.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );

  const Controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button asChild variant="outline" className="opacity-90 hover:opacity-100">
        <Link href="/spiewnik">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć
        </Link>
      </Button>

      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={toggleTheme} title="Przełącz motyw">
        {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
        Motyw
      </Button>

      <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={togglePresentation} title="Tryb prezentacji">
        {presentation ? <MonitorOff className="mr-2 h-4 w-4" /> : <MonitorUp className="mr-2 h-4 w-4" />}
        Prezentacja
      </Button>

      <Button
        variant={allText ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setAllText((v) => !v)}
        title="Cały tekst"
      >
        {allText ? <List className="mr-2 h-4 w-4" /> : <AlignLeft className="mr-2 h-4 w-4" />}
        Cały tekst
      </Button>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        variant={effectiveMode === "lyrics" ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setMode("lyrics")}
        disabled={!canChordModes && (data?.format ?? "plain") !== "plain" && (data?.format ?? "plain") !== "chordpro" ? false : false}
      >
        <Type className="mr-2 h-4 w-4" /> Tekst
      </Button>
      <Button
        variant={effectiveMode === "both" ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setMode("both")}
        disabled={!canChordModes}
      >
        <Eye className="mr-2 h-4 w-4" /> Tekst+Akordy
      </Button>
      <Button
        variant={effectiveMode === "chords" ? "default" : "outline"}
        className="opacity-90 hover:opacity-100"
        onClick={() => setMode("chords")}
        disabled={!canChordModes}
      >
        <Music className="mr-2 h-4 w-4" /> Akordy
      </Button>

    </div>
  );

  const renderChordproAbove = () => {
    if (!rendered) return null;

    return (
      <div className="space-y-2 text-left">
        {rendered.map((ln, idx) => {
          if (ln.isDirective) return null;
          if (!ln.lyrics && !ln.chords) return <div key={idx} className="h-3" />;

          const chords = ln.chords ?? "";
          const lyrics = ln.lyrics ?? "";

          if (effectiveMode === "lyrics") {
            return (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: fontPxLyrics }}>
                {lyrics}
              </div>
            );
          }

          if (effectiveMode === "chords") {
            return (
              <div
                key={idx}
                className="whitespace-pre font-mono font-semibold"
                style={{ fontSize: fontPxChords, color: chordColor }}
              >
                {chords}
              </div>
            );
          }

          // both
          return (
            <div key={idx} className="whitespace-pre font-mono">
              <div
                style={{ fontSize: fontPxChords, color: chordColor }}
                className="font-semibold"
              >
                {chords}
              </div>
              <div style={{ fontSize: fontPxLyrics }} className="leading-relaxed">
                {lyrics}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChordproInline = () => {
    // inline is only meaningful for BOTH (lyrics+chords).
    // For chords-only, we still show chord line (above) for clarity.
    if (!current) return null;
    const rawLines = splitPreserveEmptyLines(sectionBody || "");

    if (effectiveMode === "chords") {
      // show chord-only from rendered (above)
      return renderChordproAbove();
    }

    if (effectiveMode === "lyrics") {
      // strip bracket chords by reusing rendered lyrics if possible
      if (rendered) {
        return (
          <div className="space-y-2 text-left">
            {rendered.map((ln, idx) => {
              if (ln.isDirective) return null;
              if (!ln.lyrics && !ln.chords) return <div key={idx} className="h-3" />;
              return (
                <div key={idx} style={{ fontSize: fontPxLyrics }} className="whitespace-pre-wrap leading-relaxed">
                  {ln.lyrics}
                </div>
              );
            })}
          </div>
        );
      }

      // fallback: remove [..]
      return (
        <pre style={{ fontSize: fontPxLyrics }} className="whitespace-pre-wrap leading-relaxed text-left">
          {(sectionBody || "").replace(/\[[^\]]+\]/g, "")}
        </pre>
      );
    }

    // both inline
    return (
      <div className="space-y-2 text-left">
        {rawLines.map((line, idx) => {
          if (!line.length) return <div key={idx} className="h-3" />;

          const parts = parseChordProInlineLine(line);
          return (
            <div key={idx} className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: fontPxLyrics }}>
              {parts.map((p, i) => (
                <span key={i}>
                  {p.chord ? (
                    <span
                      className="font-mono font-semibold"
                      style={{ color: chordColor }}
                    >
                      {p.chord}
                    </span>
                  ) : null}
                  {p.text}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlain = (body: string) => (
    <pre style={{ fontSize: fontPxLyrics }} className="whitespace-pre-wrap leading-relaxed text-left">
      {body || "(brak treści)"}
    </pre>
  );

  const renderSectionSingle = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      );
    }
    if (!data) return <div className="text-sm text-muted-foreground">Brak takiego utworu w bazie.</div>;
    if (!current) return <div className="text-sm text-muted-foreground">Brak sekcji w utworze.</div>;

    if ((data.format ?? "plain") === "chordpro") {
      if (!detectedHasChords) {
        // chordpro without chords => show as plain lyrics
        return renderPlain(sectionBody);
      }
      return chordLayout === "above" ? renderChordproAbove() : renderChordproInline();
    }

    return renderPlain(sectionBody);
  };

  const renderAllText = () => {
    if (loading) return <Skeleton className="h-24 w-full" />;
    if (!data) return <div className="text-sm text-muted-foreground">Brak takiego utworu w bazie.</div>;
    if (!sections.length) return <div className="text-sm text-muted-foreground">Brak sekcji w utworze.</div>;

    return (
      <div className="space-y-8">
        {sections.map((s, idx) => {
          const fmt = data.format ?? "plain";
          const bodyRaw = s.body ?? "";
          const body = fmt === "chordpro" && transpose ? transposeChordPro(bodyRaw, transpose) : bodyRaw;
          const r = fmt === "chordpro" ? renderChordPro(body) : null;
          const has = fmt === "chordpro" && (Boolean(data.hasChords) || /\[[^\]]+\]/.test(bodyRaw));

          const renderOne = () => {
            if (fmt !== "chordpro" || !has) return renderPlain(body);

            if (chordLayout === "above") {
              return (
                <div className="space-y-2 text-left">
                  {r!.map((ln, i) => {
                    if (ln.isDirective) return null;
                    if (!ln.lyrics && !ln.chords) return <div key={i} className="h-3" />;

                    if (effectiveMode === "lyrics") {
                      return (
                        <div key={i} className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: fontPxLyrics }}>
                          {ln.lyrics}
                        </div>
                      );
                    }
                    if (effectiveMode === "chords") {
                      return (
                        <div key={i} className="whitespace-pre font-mono font-semibold" style={{ fontSize: fontPxChords, color: chordColor }}>
                          {ln.chords}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="whitespace-pre font-mono">
                        <div className="font-semibold" style={{ fontSize: fontPxChords, color: chordColor }}>
                          {ln.chords}
                        </div>
                        <div style={{ fontSize: fontPxLyrics }} className="leading-relaxed">
                          {ln.lyrics}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // inline
            if (effectiveMode === "chords") {
              return (
                <div className="space-y-2 text-left">
                  {r!.map((ln, i) => (
                    <div key={i} className="whitespace-pre font-mono font-semibold" style={{ fontSize: fontPxChords, color: chordColor }}>
                      {ln.chords}
                    </div>
                  ))}
                </div>
              );
            }

            if (effectiveMode === "lyrics") {
              return (
                <div className="space-y-2 text-left">
                  {r!.map((ln, i) => (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: fontPxLyrics }}>
                      {ln.lyrics}
                    </div>
                  ))}
                </div>
              );
            }

            // both inline
            const rawLines = splitPreserveEmptyLines(body);
            return (
              <div className="space-y-2 text-left">
                {rawLines.map((line, i) => {
                  if (!line.length) return <div key={i} className="h-3" />;
                  const parts = parseChordProInlineLine(line);
                  return (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: fontPxLyrics }}>
                      {parts.map((p, j) => (
                        <span key={j}>
                          {p.chord ? (
                            <span className="font-mono font-semibold" style={{ color: chordColor }}>
                              {p.chord}
                            </span>
                          ) : null}
                          {p.text}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          };

          return (
            <div key={s.id} className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {idx + 1}/{sections.length} • <span className="font-medium text-foreground">{s.label}</span>
              </div>
              <div className="rounded-xl border p-4">{renderOne()}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // ====== PRESENTATION VIEW ======
  if (presentation) {
    const lineClass = "whitespace-pre-wrap break-words block";

    const PresContent = (
      <div className="inline-block text-left font-semibold tracking-wide">
        {presLines.map((l, i) => (
          <div
            key={i}
            className={cn(lineClass, l.kind === "gap" ? "opacity-0" : "")}
            style={
              l.kind === "chords"
                ? { fontSize: `${chordScale}em`, opacity: 0.85, color: chordColor }
                : { fontSize: "1em" }
            }
          >
            {l.text.length ? l.text : "\u00A0"}
          </div>
        ))}
      </div>
    );

    return (
      <div className="fixed inset-0 z-50 bg-background text-foreground touch-pan-y">
        <style jsx global>{`
          @keyframes slideInR {
            from { transform: translateX(10%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideInL {
            from { transform: translateX(-10%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .sp-slide-in-right { animation: slideInR 180ms ease-out; }
          .sp-slide-in-left { animation: slideInL 180ms ease-out; }
        `}</style>

        <button
          onClick={togglePresentation}
          className={cn(
            "absolute left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border bg-background/70 backdrop-blur",
            "transition-opacity duration-300",
            exitVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label="Wyjdź z prezentacji"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className="absolute inset-0 px-3 py-3 sm:px-8 sm:py-8"
          onPointerDown={bumpExit}
          onPointerMove={bumpExit}
          onTouchStart={bumpExit}
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex-1">
              <div className="relative h-full w-full rounded-2xl border bg-card/40">
                <div
                  ref={fitBoxRef}
                  className="relative h-full w-full overflow-hidden p-6 sm:p-12"
                  style={{ fontSize: `${fittedPx}px`, lineHeight: 1.1 }}
                >
                  <div className="pointer-events-none absolute left-0 top-0 opacity-0">
                    <div ref={measureRef} className="inline-block">
                      {PresContent}
                    </div>
                  </div>

                  <div
                    key={sectionIndex}
                    className={cn(
                      "flex h-full flex-col justify-center",
                      slideDir === 1 ? "sp-slide-in-right" : "sp-slide-in-left"
                    )}
                  >
                    {PresContent}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground opacity-60">
              <div>
                {sections.length ? (
                  <>
                    {sectionIndex + 1}/{sections.length} • {current?.label ?? "—"}
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div>{nextLabel ? `Następny: ${nextLabel}` : "Koniec"}</div>
            </div>
          </div>
        </div>

        <button
          onClick={goPrev}
          disabled={sectionIndex <= 0}
          className={cn(
            "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border bg-background/30 backdrop-blur transition-opacity",
            sectionIndex <= 0 ? "opacity-10" : "opacity-15 hover:opacity-80"
          )}
          aria-label="Poprzednia sekcja"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={goNext}
          disabled={sectionIndex >= sections.length - 1}
          className={cn(
            "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full border bg-background/30 backdrop-blur transition-opacity",
            sectionIndex >= sections.length - 1 ? "opacity-10" : "opacity-15 hover:opacity-80"
          )}
          aria-label="Następna sekcja"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    );
  }

  // ====== NORMAL VIEW ======
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      {Controls}
      {HeaderBlock}

      <Card>
        <CardContent className="p-6 space-y-4">
          {allText ? null : (
            <>
              {SectionNav}
            </>
          )}

       

          {allText ? renderAllText() : renderSectionSingle()}

          <div className="pt-2 flex justify-end">
            <Button variant="outline" onClick={togglePresentation}>
              <MonitorUp className="mr-2 h-4 w-4" />
              Tryb prezentacji
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
