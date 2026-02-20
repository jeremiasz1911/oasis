import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import type { Song, SongFull, SongSection } from "../types";
import { normalizeText } from "../utils";

type SongDoc = {
  title: string;
  titleLower: string;
  categories: string[];
  format?: "plain" | "chordpro";
  body?: string;
  sections?: SongSection[];
  hasChords?: boolean;
};

function mapSong(id: string, data: SongDoc): Song {
  return {
    id,
    title: data.title,
    categories: data.categories ?? [],
    hasChords: Boolean(data.hasChords),
  };
}

export async function fetchSongs(opts: {
  q?: string;
  cat?: string; // "all" lub slug
  take?: number;
}): Promise<Song[]> {
  const take = opts.take ?? 200;
  const cat = opts.cat ?? "all";
  const qRaw = (opts.q ?? "").trim();
  const qNorm = normalizeText(qRaw);

  const col = collection(db, "songs");

  if (qNorm) {
    const upper = qNorm + "\uf8ff";
    const qy = query(
      col,
      where("titleLower", ">=", qNorm),
      where("titleLower", "<=", upper),
      orderBy("titleLower"),
      limit(take)
    );

    const snap = await getDocs(qy);
    let songs = snap.docs.map((d) => mapSong(d.id, d.data() as SongDoc));
    if (cat !== "all") songs = songs.filter((s) => s.categories.includes(cat));
    return songs;
  }

  if (cat !== "all") {
    const qy = query(
      col,
      where("categories", "array-contains", cat),
      orderBy("titleLower"),
      limit(take)
    );
    const snap = await getDocs(qy);
    return snap.docs.map((d) => mapSong(d.id, d.data() as SongDoc));
  }

  const qy = query(col, orderBy("titleLower"), limit(take));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => mapSong(d.id, d.data() as SongDoc));
}

function fallbackSectionsFromBody(body: string): SongSection[] {
  return [{
    id: "section-1",
    label: "Tekst",
    kind: "other",
    body: body ?? "",
  }];
}

export async function fetchSongById(songId: string): Promise<SongFull | null> {
  if (!songId || typeof songId !== "string") return null;
  const safeId = songId.trim();
  if (!safeId) return null;

  const ref = doc(db, "songs", safeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as SongDoc;

  const body = data.body ?? "";
  const sections = Array.isArray(data.sections) && data.sections.length
    ? data.sections
    : fallbackSectionsFromBody(body);

  return {
    id: snap.id,
    title: data.title,
    titleLower: data.titleLower,
    categories: data.categories ?? [],
    format: data.format ?? "plain",
    body,
    sections,
    hasChords: Boolean(data.hasChords),
  };
}
