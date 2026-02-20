import { db } from "@/lib/firebase/client";
import { doc, serverTimestamp, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { normalizeText } from "../utils";
import type { SongSection } from "../types";

export type SongWriteInput = {
  id: string; // doc id (slug)
  title: string;
  categories: string[];
  format: "plain" | "chordpro";
  hasChords: boolean;
  sections: SongSection[];
};

function aggregateBody(sections: SongSection[]) {
  return (sections ?? []).map((s) => s.body ?? "").join("\n\n").trim();
}

export async function createSong(input: SongWriteInput) {
  const ref = doc(db, "songs", input.id);
  const body = aggregateBody(input.sections);

  await setDoc(ref, {
    title: input.title,
    titleLower: normalizeText(input.title),
    categories: input.categories,
    format: input.format,
    hasChords: input.hasChords,
    sections: input.sections,
    body,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSong(input: SongWriteInput) {
  const ref = doc(db, "songs", input.id);
  const body = aggregateBody(input.sections);

  await updateDoc(ref, {
    title: input.title,
    titleLower: normalizeText(input.title),
    categories: input.categories,
    format: input.format,
    hasChords: input.hasChords,
    sections: input.sections,
    body,
    updatedAt: serverTimestamp(),
  });
}

export async function removeSong(songId: string) {
  await deleteDoc(doc(db, "songs", songId));
}
